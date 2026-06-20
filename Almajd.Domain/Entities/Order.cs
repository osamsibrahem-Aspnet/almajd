using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class Order : BaseEntity
{
    public string Number { get; set; } = default!;        // ORD-2026-000001

    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public OrderChannel Channel { get; set; } = OrderChannel.App;
    public OrderStatus Status { get; set; } = OrderStatus.Draft;

    public string Currency { get; set; } = "EGP";

    /// <summary>Snapshotted at submission so the order is immutable to later customer changes.</summary>
    public int PaymentTermsNetDays { get; set; }

    public Guid? ShipToAddressId { get; set; }
    public CustomerAddress? ShipToAddress { get; set; }
    public string? ShipToAddressSnapshot { get; set; }

    public Guid? SalesRepId { get; set; }
    public ApplicationUser? SalesRep { get; set; }

    public Guid? CouponId { get; set; }
    public DiscountCoupon? Coupon { get; set; }
    public decimal CouponDiscountAmount { get; set; }

    // Totals — denormalised for fast list rendering. Recomputed on every line change.
    public decimal SubTotal { get; set; }
    public decimal LineDiscountTotal { get; set; }
    public decimal TaxTotal { get; set; }
    public decimal Total { get; set; }

    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }

    /// <summary>Expected ship date — used by late-order detection.</summary>
    public DateTime? ExpectedShipAt { get; set; }

    public string? Notes { get; set; }

    public ICollection<OrderLine> Lines { get; set; } = new List<OrderLine>();
}
