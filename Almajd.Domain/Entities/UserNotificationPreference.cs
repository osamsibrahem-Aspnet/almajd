using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

/// <summary>
/// Per-user opt-in for a (Category, Channel) pair. If no row exists for a pair, the default
/// is "enabled" — opt-out is explicit. Storing as positive rows keeps queries simple.
/// </summary>
public class UserNotificationPreference : BaseEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;

    public NotificationCategory Category { get; set; }
    public NotificationChannel Channel { get; set; }
    public bool Enabled { get; set; } = true;
}
