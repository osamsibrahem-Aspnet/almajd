namespace Almajd.Domain.Entities;

public class GoodsReceiptLine : BaseEntity
{
    public Guid GoodsReceiptId { get; set; }
    public GoodsReceipt GoodsReceipt { get; set; } = null!;

    public Guid PurchaseOrderLineId { get; set; }
    public PurchaseOrderLine PurchaseOrderLine { get; set; } = null!;

    public Guid SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    public int Qty { get; set; }

    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;
}
