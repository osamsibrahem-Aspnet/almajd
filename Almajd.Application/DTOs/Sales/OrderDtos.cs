using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Sales;

public class OrderLineInputDto
{
    [Required] public Guid SkuId { get; set; }
    [Range(1, int.MaxValue)] public int Qty { get; set; }
    /// <summary>Optional manual unit-price override (requires Admin/SalesRep with discount permission).</summary>
    public decimal? UnitPriceOverride { get; set; }
    /// <summary>Optional manual discount % override.</summary>
    public decimal? DiscountPctOverride { get; set; }
}

public class OrderCreateDto
{
    [Required] public Guid CustomerId { get; set; }
    public OrderChannel Channel { get; set; } = OrderChannel.App;
    public Guid? ShipToAddressId { get; set; }
    public string? CouponCode { get; set; }
    [StringLength(2000)] public string? Notes { get; set; }
    public DateTime? ExpectedShipAt { get; set; }
    [Required, MinLength(1)] public List<OrderLineInputDto> Lines { get; set; } = new();
}

public class OrderUpdateDraftDto
{
    public Guid? ShipToAddressId { get; set; }
    public string? CouponCode { get; set; }
    [StringLength(2000)] public string? Notes { get; set; }
    public DateTime? ExpectedShipAt { get; set; }
    [Required, MinLength(1)] public List<OrderLineInputDto> Lines { get; set; } = new();
}

public class OrderLineDto
{
    public Guid Id { get; set; }
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string Barcode { get; set; } = default!;
    public string ProductName { get; set; } = default!;
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPct { get; set; }
    public decimal TaxPct { get; set; }
    public decimal LineSubTotal { get; set; }
    public decimal LineDiscountAmount { get; set; }
    public decimal LineNet { get; set; }
    public decimal LineTaxAmount { get; set; }
    public decimal LineTotal { get; set; }
    public string? PriceSource { get; set; }
    public Guid? ReservedFromLocationId { get; set; }
    public string? ReservedFromLocationAddress { get; set; }
}

public class OrderListItemDto
{
    public Guid Id { get; set; }
    public string Number { get; set; } = default!;
    public Guid CustomerId { get; set; }
    public string CustomerCode { get; set; } = default!;
    public string CustomerName { get; set; } = default!;
    public OrderChannel Channel { get; set; }
    public OrderStatus Status { get; set; }
    public decimal Total { get; set; }
    public string Currency { get; set; } = default!;
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ExpectedShipAt { get; set; }
    public bool IsLate { get; set; }
    public int LineCount { get; set; }
}

public class OrderDto : OrderListItemDto
{
    public int PaymentTermsNetDays { get; set; }
    public Guid? ShipToAddressId { get; set; }
    public string? ShipToAddressSnapshot { get; set; }
    public Guid? SalesRepId { get; set; }
    public string? SalesRepName { get; set; }
    public Guid? CouponId { get; set; }
    public string? CouponCode { get; set; }
    public decimal CouponDiscountAmount { get; set; }
    public decimal SubTotal { get; set; }
    public decimal LineDiscountTotal { get; set; }
    public decimal TaxTotal { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }
    public string? Notes { get; set; }
    public IReadOnlyList<OrderLineDto> Lines { get; set; } = Array.Empty<OrderLineDto>();
}

public class OrderSearchQuery
{
    public string? Search { get; set; }
    public Guid? CustomerId { get; set; }
    public OrderStatus? Status { get; set; }
    public OrderChannel? Channel { get; set; }
    public Guid? SalesRepId { get; set; }
    public bool? Late { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    /// <summary>One of: recent, total-desc, total-asc, status.</summary>
    public string? Sort { get; set; }
}

public class CancelOrderDto
{
    [StringLength(512)] public string? Reason { get; set; }
}
