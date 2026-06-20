using System.Data;
using System.Data.Common;
using Almajd.Application.Interfaces;
using Almajd.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Infrastructure.Billing;

/// <summary>
/// SQL Server-specific gapless invoice number generator.
///
/// Implementation: a single atomic <c>UPDATE InvoiceCounters … OUTPUT DELETED.NextSequence</c>
/// statement. The UPDATE acquires an exclusive row-lock for the statement's lifetime, so
/// concurrent callers serialise at the SQL engine level. <c>OUTPUT DELETED</c> returns the
/// pre-increment value — that's the sequence we assign to the new invoice. EF Core's change
/// tracker is bypassed entirely; there is no read-then-update window where a race could occur.
///
/// First call for a brand-new year lazily inserts the counter row with
/// <c>WHERE NOT EXISTS</c> so concurrent first-issuers can't double-insert.
/// </summary>
public class SqlServerInvoiceNumberGenerator : IInvoiceNumberGenerator
{
    private readonly ApplicationDbContext _db;

    public SqlServerInvoiceNumberGenerator(ApplicationDbContext db) => _db = db;

    public async Task<string> NextAsync(int year)
    {
        var connection = _db.Database.GetDbConnection();
        var wasClosed = connection.State == ConnectionState.Closed;
        if (wasClosed) await connection.OpenAsync();

        try
        {
            var seq = await TryIncrementAsync(connection, year);
            if (seq.HasValue) return Format(year, seq.Value);

            // Year row not seeded — insert if-missing then re-try.
            await using (var insertCmd = connection.CreateCommand())
            {
                insertCmd.CommandText = """
                    INSERT INTO InvoiceCounters ([Year], [NextSequence])
                    SELECT @year, 1
                    WHERE NOT EXISTS (SELECT 1 FROM InvoiceCounters WHERE [Year] = @year)
                    """;
                AddYearParam(insertCmd, year);
                await insertCmd.ExecuteNonQueryAsync();
            }

            seq = await TryIncrementAsync(connection, year);
            if (seq is null)
                throw new InvalidOperationException(
                    $"Invoice counter for year {year} could not be initialised.");

            return Format(year, seq.Value);
        }
        finally
        {
            if (wasClosed) await connection.CloseAsync();
        }
    }

    private static async Task<int?> TryIncrementAsync(DbConnection connection, int year)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            UPDATE InvoiceCounters WITH (UPDLOCK, HOLDLOCK)
            SET [NextSequence] = [NextSequence] + 1
            OUTPUT DELETED.[NextSequence]
            WHERE [Year] = @year
            """;
        AddYearParam(cmd, year);

        var result = await cmd.ExecuteScalarAsync();
        return result is null or DBNull ? null : Convert.ToInt32(result);
    }

    private static void AddYearParam(DbCommand cmd, int year)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = "@year";
        p.Value = year;
        cmd.Parameters.Add(p);
    }

    private static string Format(int year, int seq) => $"INV-{year}-{seq:D6}";
}
