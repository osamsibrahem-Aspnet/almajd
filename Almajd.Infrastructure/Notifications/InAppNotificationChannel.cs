using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;

namespace Almajd.Infrastructure.Notifications;

/// <summary>
/// In-app inbox — no external delivery, just a successful Notification row that the user reads
/// from their inbox endpoint. Always succeeds.
/// </summary>
public class InAppNotificationChannel : INotificationChannel
{
    public NotificationChannel Channel => NotificationChannel.InApp;

    public Task<string?> SendAsync(ApplicationUser user, Notification notification, CancellationToken ct)
        => Task.FromResult<string?>(null);
}
