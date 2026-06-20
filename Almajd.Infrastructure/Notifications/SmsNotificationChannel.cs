using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace Almajd.Infrastructure.Notifications;

/// <summary>
/// Stubbed SMS channel — logs what would be sent. Replace with Twilio for prod (Twilio is already
/// in csproj from the LMS lineage).
/// </summary>
public class SmsNotificationChannel : INotificationChannel
{
    private readonly ILogger<SmsNotificationChannel> _logger;

    public SmsNotificationChannel(ILogger<SmsNotificationChannel> logger) => _logger = logger;

    public NotificationChannel Channel => NotificationChannel.Sms;

    public Task<string?> SendAsync(ApplicationUser user, Notification notification, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(user.PhoneNumber))
            return Task.FromResult<string?>("User has no phone number.");

        _logger.LogInformation("[SMS stub] to={Phone} body={Body}", user.PhoneNumber, notification.Body);
        return Task.FromResult<string?>(null);
    }
}
