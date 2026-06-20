namespace Almajd.Domain.Entities;

public class PriceListLine : BaseEntity
{
    public Guid PriceListId { get; set; }
    public PriceList PriceList { get; set; } = null!;

    public Guid SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    public decimal UnitPrice { get; set; }
    public int MinQty { get; set; } = 1;

    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
}
