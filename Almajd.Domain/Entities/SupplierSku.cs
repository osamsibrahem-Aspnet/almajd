namespace Almajd.Domain.Entities;

/// <summary>
/// Links a SKU to a supplier with their specific code, lead time and current cost.
/// IsPreferred marks the default supplier for replenishment suggestions.
/// </summary>
public class SupplierSku : BaseEntity
{
    public Guid SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public Guid SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    /// <summary>The code the supplier uses for this SKU (may differ from ours).</summary>
    public string? SupplierSkuCode { get; set; }

    public int LeadTimeDays { get; set; }
    public decimal CostPrice { get; set; }
    public string Currency { get; set; } = "EGP";

    public bool IsPreferred { get; set; }
}
