using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class PurchaseOrder : BaseEntity
{
    public string Number { get; set; } = default!;        // PO-2026-000001

    public Guid SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Draft;
    public string Currency { get; set; } = "EGP";

    public DateTime? ExpectedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? CancelledAt { get; set; }

    public Guid? ApprovedByUserId { get; set; }
    public ApplicationUser? ApprovedBy { get; set; }

    public string? CancellationReason { get; set; }
    public string? Notes { get; set; }

    /// <summary>Sum of (Qty * CostPrice) across all lines, denormalised.</summary>
    public decimal Total { get; set; }

    public ICollection<PurchaseOrderLine> Lines { get; set; } = new List<PurchaseOrderLine>();
}
