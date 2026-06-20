namespace Almajd.Domain.Entities;

public class PurchaseOrderLine : BaseEntity
{
    public Guid PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;

    public Guid SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    public int Qty { get; set; }
    public int ReceivedQty { get; set; }

    public decimal CostPrice { get; set; }

    public decimal LineTotal => CostPrice * Qty;

    public bool IsFullyReceived => ReceivedQty >= Qty;
}
