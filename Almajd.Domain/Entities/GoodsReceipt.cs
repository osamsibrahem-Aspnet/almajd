namespace Almajd.Domain.Entities;

public class GoodsReceipt : BaseEntity
{
    public string Number { get; set; } = default!;        // GR-2026-000001

    public Guid PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;

    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

    public Guid? ReceivedByUserId { get; set; }
    public ApplicationUser? ReceivedBy { get; set; }

    public string? Notes { get; set; }

    public ICollection<GoodsReceiptLine> Lines { get; set; } = new List<GoodsReceiptLine>();
}
