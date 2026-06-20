using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using Almajd.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Almajd.Infrastructure.Notifications;

/// <summary>
/// Stubbed push channel — looks up active device tokens for the user and logs what would be sent.
/// Replace with a real FCM/APNs client in Phase 1.5 (introduce IPushSender abstraction). For MVP,
/// every dispatch is recorded as Sent so the inbox + audit work end-to-end.
/// </summary>
public class PushNotificationChannel : INotificationChannel
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<PushNotificationChannel> _logger;

    public PushNotificationChannel(ApplicationDbContext db, ILogger<PushNotificationChannel> logger)
    {
        _db = db;
        _logger = logger;
    }

    public NotificationChannel Channel => NotificationChannel.Push;

    public async Task<string?> SendAsync(ApplicationUser user, Notification notification, CancellationToken ct)
    {
        var tokens = await _db.DeviceTokens
            .Where(t => t.UserId == user.Id && t.IsActive)
            .Select(t => new { t.Token, t.Platform })
            .ToListAsync(ct);

        if (tokens.Count == 0)
            return "No active device tokens for user.";

        foreach (var t in tokens)
        {
            _logger.LogInformation(
                "[PUSH stub] {Platform} token={Token} title={Title} body={Body}",
                t.Platform, t.Token[..Math.Min(16, t.Token.Length)] + "…",
                notification.Title, notification.Body);
        }

        return null;
    }
}
