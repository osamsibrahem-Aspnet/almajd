namespace Almajd.Domain.Entities;

public class CreditNote : BaseEntity
{
    public string Number { get; set; } = default!;        // CN-2026-000001

    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EGP";
    public string Reason { get; set; } = default!;

    public Guid? IssuedByUserId { get; set; }
    public ApplicationUser? IssuedBy { get; set; }
}
