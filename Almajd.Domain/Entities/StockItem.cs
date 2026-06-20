namespace Almajd.Domain.Entities;

/// <summary>
/// Quantity of a SKU at a specific location. Composite uniqueness on (SkuId, LocationId)
/// is enforced by index; the entity carries its own Guid Id so it fits the generic repository contract.
/// Invariant: QtyOnHand &gt;= QtyReserved.
/// </summary>
public class StockItem : BaseEntity
{
    public Guid SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public int QtyOnHand { get; set; }
    public int QtyReserved { get; set; }

    public int QtyAvailable => QtyOnHand - QtyReserved;
}
