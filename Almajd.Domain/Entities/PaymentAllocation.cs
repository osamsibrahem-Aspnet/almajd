namespace Almajd.Domain.Entities;

/// <summary>
/// Links part of a payment to a specific invoice. One payment can settle multiple invoices.
/// </summary>
public class PaymentAllocation : BaseEntity
{
    public Guid PaymentId { get; set; }
    public Payment Payment { get; set; } = null!;

    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public decimal Amount { get; set; }
}
