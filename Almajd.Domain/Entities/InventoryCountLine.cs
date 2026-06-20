namespace Almajd.Domain.Entities;

public class InventoryCountLine : BaseEntity
{
    public Guid CountId { get; set; }
    public InventoryCount Count { get; set; } = null!;

    public Guid SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public int SystemQty { get; set; }
    public int CountedQty { get; set; }
    public int Variance => CountedQty - SystemQty;
}
