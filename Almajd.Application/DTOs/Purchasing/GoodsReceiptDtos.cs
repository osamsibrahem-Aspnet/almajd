using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Purchasing;

public class GoodsReceiptLineInputDto
{
    [Required] public Guid PurchaseOrderLineId { get; set; }
    [Range(1, int.MaxValue)] public int Qty { get; set; }
    [Required] public Guid LocationId { get; set; }
}

public class GoodsReceiptCreateDto
{
    [Required] public Guid PurchaseOrderId { get; set; }
    [StringLength(2000)] public string? Notes { get; set; }
    [Required, MinLength(1)] public List<GoodsReceiptLineInputDto> Lines { get; set; } = new();
}

public class GoodsReceiptLineDto
{
    public Guid Id { get; set; }
    public Guid PurchaseOrderLineId { get; set; }
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string ProductName { get; set; } = default!;
    public int Qty { get; set; }
    public Guid LocationId { get; set; }
    public string LocationAddress { get; set; } = default!;
}

public class GoodsReceiptDto
{
    public Guid Id { get; set; }
    public string Number { get; set; } = default!;
    public Guid PurchaseOrderId { get; set; }
    public string PurchaseOrderNumber { get; set; } = default!;
    public string SupplierName { get; set; } = default!;
    public DateTime ReceivedAt { get; set; }
    public Guid? ReceivedByUserId { get; set; }
    public string? ReceivedByName { get; set; }
    public string? Notes { get; set; }
    public int LineCount { get; set; }
    public IReadOnlyList<GoodsReceiptLineDto> Lines { get; set; } = Array.Empty<GoodsReceiptLineDto>();
}

public class GoodsReceiptSearchQuery
{
    public Guid? PurchaseOrderId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
