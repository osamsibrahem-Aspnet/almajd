using Almajd.Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace Almajd.Infrastructure.Email;

public class MailKitEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<MailKitEmailSender> _logger;

    public MailKitEmailSender(IConfiguration config, ILogger<MailKitEmailSender> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        var from = _config["MailSettings:From"];
        var smtpHost = _config["MailSettings:SmtpServer"];
        var portStr = _config["MailSettings:Port"];
        var username = _config["MailSettings:Username"];
        var password = _config["MailSettings:Password"];

        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(smtpHost))
        {
            _logger.LogWarning("Mail not configured — would have sent to {To} subject {Subject}.", to, subject);
            return;
        }

        var port = int.TryParse(portStr, out var p) ? p : 587;

        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(from));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(smtpHost, port, SecureSocketOptions.StartTls);
        if (!string.IsNullOrWhiteSpace(username))
            await smtp.AuthenticateAsync(username, password);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);
    }
}
