namespace Almajd.Application.Interfaces;

public interface ISmsSender
{
    Task SendAsync(string phoneE164, string message, CancellationToken ct = default);
}
