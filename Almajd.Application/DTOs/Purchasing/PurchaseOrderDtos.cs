using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Purchasing;

public class PurchaseOrderLineInputDto
{
    [Required] public Guid SkuId { get; set; }
    [Range(1, int.MaxValue)] public int Qty { get; set; }
    [Range(0.01, double.MaxValue)] public decimal CostPrice { get; set; }
}

public class PurchaseOrderCreateDto
{
    [Required] public Guid SupplierId { get; set; }
    public DateTime? ExpectedAt { get; set; }
    [StringLength(2000)] public string? Notes { get; set; }
    [Required, MinLength(1)] public List<PurchaseOrderLineInputDto> Lines { get; set; } = new();
}

public class PurchaseOrderUpdateDraftDto
{
    public DateTime? ExpectedAt { get; set; }
    [StringLength(2000)] public string? Notes { get; set; }
    [Required, MinLength(1)] public List<PurchaseOrderLineInputDto> Lines { get; set; } = new();
}

public class CancelPurchaseOrderDto
{
    [StringLength(512)] public string? Reason { get; set; }
}

public class PurchaseOrderLineDto
{
    public Guid Id { get; set; }
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string ProductName { get; set; } = default!;
    public int Qty { get; set; }
    public int ReceivedQty { get; set; }
    public int OutstandingQty { get; set; }
    public decimal CostPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class PurchaseOrderListItemDto
{
    public Guid Id { get; set; }
    public string Number { get; set; } = default!;
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = default!;
    public PurchaseOrderStatus Status { get; set; }
    public string Currency { get; set; } = default!;
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpectedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int LineCount { get; set; }
}

public class PurchaseOrderDto : PurchaseOrderListItemDto
{
    public DateTime? ApprovedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? ApprovedByName { get; set; }
    public string? CancellationReason { get; set; }
    public string? Notes { get; set; }
    public IReadOnlyList<PurchaseOrderLineDto> Lines { get; set; } = Array.Empty<PurchaseOrderLineDto>();
}

public class PurchaseOrderSearchQuery
{
    public string? Search { get; set; }
    public Guid? SupplierId { get; set; }
    public PurchaseOrderStatus? Status { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
