namespace Almajd.Domain.Entities;

public class OrderLine : BaseEntity
{
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public Guid SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPct { get; set; }
    public decimal TaxPct { get; set; }

    /// <summary>Snapshot of which pricing source applied (CustomerOverride, TierList, DefaultList, Manual).</summary>
    public string? PriceSource { get; set; }

    // Computed monetary fields, denormalised:
    public decimal LineSubTotal { get; set; }       // Qty * UnitPrice
    public decimal LineDiscountAmount { get; set; } // LineSubTotal * DiscountPct/100
    public decimal LineNet { get; set; }            // LineSubTotal - LineDiscountAmount
    public decimal LineTaxAmount { get; set; }      // LineNet * TaxPct/100
    public decimal LineTotal { get; set; }          // LineNet + LineTaxAmount

    /// <summary>Location stock was reserved from at order Approved. M5 Fulfilment uses it for picking.</summary>
    public Guid? ReservedFromLocationId { get; set; }
    public Location? ReservedFromLocation { get; set; }
}
