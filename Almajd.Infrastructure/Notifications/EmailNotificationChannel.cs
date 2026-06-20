using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace Almajd.Infrastructure.Notifications;

public class EmailNotificationChannel : INotificationChannel
{
    private readonly IEmailSender _email;
    private readonly ILogger<EmailNotificationChannel> _logger;

    public EmailNotificationChannel(IEmailSender email, ILogger<EmailNotificationChannel> logger)
    {
        _email = email;
        _logger = logger;
    }

    public NotificationChannel Channel => NotificationChannel.Email;

    public async Task<string?> SendAsync(ApplicationUser user, Notification notification, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
            return "User has no email address.";

        try
        {
            await _email.SendAsync(user.Email, notification.Title, notification.Body);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Email send failed for {Email}", user.Email);
            return ex.Message;
        }
    }
}
