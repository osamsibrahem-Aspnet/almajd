using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class InventoryCount : BaseEntity
{
    public Guid WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;

    public InventoryCountStatus Status { get; set; } = InventoryCountStatus.Draft;
    public DateTime? StartedAt { get; set; }
    public DateTime? PostedAt { get; set; }
    public string? Notes { get; set; }

    public ICollection<InventoryCountLine> Lines { get; set; } = new List<InventoryCountLine>();
}
