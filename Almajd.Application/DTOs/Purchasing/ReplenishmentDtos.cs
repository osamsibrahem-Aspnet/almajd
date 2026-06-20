namespace Almajd.Application.DTOs.Purchasing;

public class ReplenishmentSuggestionDto
{
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string Barcode { get; set; } = default!;
    public string ProductName { get; set; } = default!;

    public int ReorderPoint { get; set; }
    public int ReorderQty { get; set; }
    public int AvailableQty { get; set; }
    public int SuggestedQty { get; set; }

    public Guid? PreferredSupplierId { get; set; }
    public string? PreferredSupplierName { get; set; }
    public decimal? LastCostPrice { get; set; }
}
