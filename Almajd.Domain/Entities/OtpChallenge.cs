namespace Almajd.Domain.Entities;

/// <summary>
/// A one-time-password challenge issued for phone-based login. The plaintext code is never
/// stored — only an HMAC-SHA256 hash. Verified rows are kept for audit; expired rows can be
/// purged by a future background sweeper.
/// </summary>
public class OtpChallenge : BaseEntity
{
    public string PhoneE164 { get; set; } = default!;
    public string CodeHash { get; set; } = default!;
    public DateTime ExpiresAt { get; set; }
    public int AttemptsRemaining { get; set; } = 5;
    public DateTime? VerifiedAt { get; set; }
    public string? Ip { get; set; }
}
