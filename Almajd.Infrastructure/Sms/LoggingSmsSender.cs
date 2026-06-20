using Almajd.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace Almajd.Infrastructure.Sms;

/// <summary>
/// Dev/MVP SMS sender that just logs what would be sent. Twilio is already in csproj — swap
/// this for a TwilioSmsSender in Phase 1.5 when the Twilio creds are provisioned.
/// </summary>
public class LoggingSmsSender : ISmsSender
{
    private readonly ILogger<LoggingSmsSender> _logger;

    public LoggingSmsSender(ILogger<LoggingSmsSender> logger) => _logger = logger;

    public Task SendAsync(string phoneE164, string message, CancellationToken ct = default)
    {
        _logger.LogInformation("[SMS stub] to={Phone} body={Message}", phoneE164, message);
        return Task.CompletedTask;
    }
}
