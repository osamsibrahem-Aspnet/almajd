using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class PickList : BaseEntity
{
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public PickListStatus Status { get; set; } = PickListStatus.Pending;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public Guid? PickedByUserId { get; set; }
    public ApplicationUser? PickedBy { get; set; }

    public ICollection<PickListLine> Lines { get; set; } = new List<PickListLine>();
}
