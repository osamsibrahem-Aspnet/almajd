namespace Almajd.Domain.Entities;

public class Sku : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public string Code { get; set; } = default!;
    public string Barcode { get; set; } = default!;

    /// <summary>JSON dictionary of attribute values (e.g. {"wattage":20,"connector":"USB-C"}).</summary>
    public string? AttributesJson { get; set; }

    public int WeightG { get; set; }
    public bool IsActive { get; set; } = true;

    // Purchasing / replenishment (set per SKU; null = no auto-replenishment).
    public int? ReorderPoint { get; set; }
    public int? ReorderQty { get; set; }

    /// <summary>Moving weighted-average cost updated on each Goods Receipt. Null until first receipt.</summary>
    public decimal? AverageCost { get; set; }
}
