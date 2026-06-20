namespace Almajd.Domain.Entities;

public class PickListLine : BaseEntity
{
    public Guid PickListId { get; set; }
    public PickList PickList { get; set; } = null!;

    public Guid OrderLineId { get; set; }
    public OrderLine OrderLine { get; set; } = null!;

    public Guid SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public int RequestedQty { get; set; }
    public int PickedQty { get; set; }

    /// <summary>Set true when operator confirms the remaining qty is unavailable.</summary>
    public bool IsShort { get; set; }
    public string? ShortReason { get; set; }
}
