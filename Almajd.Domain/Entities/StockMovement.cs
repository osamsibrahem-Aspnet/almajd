using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

/// <summary>
/// Append-only audit ledger of every stock change. Corrections are new movements, never edits.
/// </summary>
public class StockMovement : BaseEntity
{
    public Guid SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    public Guid? FromLocationId { get; set; }
    public Location? FromLocation { get; set; }

    public Guid? ToLocationId { get; set; }
    public Location? ToLocation { get; set; }

    public int Quantity { get; set; }
    public StockMovementType Type { get; set; }

    /// <summary>Originating document type (e.g. "PurchaseOrder", "Order", "ReturnReceipt", "AdjustmentManual").</summary>
    public string? ReferenceType { get; set; }

    /// <summary>Originating document Id.</summary>
    public Guid? ReferenceId { get; set; }

    public Guid? UserId { get; set; }
    public string? Notes { get; set; }

    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
