using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;

    public string TemplateCode { get; set; } = default!;
    public NotificationCategory Category { get; set; }
    public NotificationChannel Channel { get; set; }
    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;

    public string Title { get; set; } = default!;            // rendered
    public string Body { get; set; } = default!;             // rendered

    /// <summary>JSON snapshot of the data used for rendering — for audit / re-render.</summary>
    public string? PayloadJson { get; set; }

    public DateTime? SentAt { get; set; }
    public string? Error { get; set; }
}
