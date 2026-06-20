using Almajd.Domain.Entities;
using Almajd.Domain.Enums;

namespace Almajd.Application.Interfaces;

/// <summary>
/// Channel-specific delivery (email, push, sms). Each implementation knows its channel
/// and how to ship a rendered notification.
/// </summary>
public interface INotificationChannel
{
    NotificationChannel Channel { get; }

    /// <summary>Returns null on success, error message on failure.</summary>
    Task<string?> SendAsync(ApplicationUser user, Notification notification, CancellationToken ct);
}
