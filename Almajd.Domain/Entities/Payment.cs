using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class Payment : BaseEntity
{
    public string Number { get; set; } = default!;        // PAY-2026-000001

    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EGP";

    public DateTime PaidAt { get; set; } = DateTime.UtcNow;

    public string? Reference { get; set; }                 // bank ref, cheque #, etc.
    public string? Notes { get; set; }

    public Guid? RecordedByUserId { get; set; }
    public ApplicationUser? RecordedBy { get; set; }

    public ICollection<PaymentAllocation> Allocations { get; set; } = new List<PaymentAllocation>();

    public decimal AllocatedAmount => Allocations.Sum(a => a.Amount);
    public decimal Unallocated => Amount - AllocatedAmount;
}
