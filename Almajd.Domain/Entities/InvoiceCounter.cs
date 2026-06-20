namespace Almajd.Domain.Entities;

/// <summary>
/// Single row per year. Locked via UPDLOCK + HOLDLOCK during issue to guarantee a gapless,
/// monotonically increasing invoice sequence. Does NOT inherit BaseEntity because Year is the
/// natural primary key.
/// </summary>
public class InvoiceCounter
{
    public int Year { get; set; }       // PK
    public int NextSequence { get; set; }
}
