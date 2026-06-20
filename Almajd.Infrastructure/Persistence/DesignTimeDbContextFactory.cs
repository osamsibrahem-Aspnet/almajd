using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Almajd.Infrastructure.Persistence;

/// <summary>
/// Used by `dotnet ef` at design-time so migrations can be added without booting the
/// full API host (which would require JWT:Key + DefaultAdmin:Password user-secrets).
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ALMAJD_DESIGNTIME_CONN")
            ?? "Server=(localdb)\\MSSQLLocalDB;Database=Almajd_DesignTime;Trusted_Connection=True;TrustServerCertificate=True";

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(connection)
            .Options;

        return new ApplicationDbContext(options);
    }
}
