namespace Almajd.Domain.Entities;

public class Location : BaseEntity
{
    public Guid WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;

    public string Zone { get; set; } = default!;
    public string Aisle { get; set; } = default!;
    public string Shelf { get; set; } = default!;
    public string Bin { get; set; } = default!;

    /// <summary>If false, the location is reserved for damaged/returns/quarantine — picklists skip it.</summary>
    public bool IsPickable { get; set; } = true;

    /// <summary>Computed human-readable address, e.g. "A-12-3-B".</summary>
    public string Address => $"{Zone}-{Aisle}-{Shelf}-{Bin}";
}
