namespace Almajd.Application.Interfaces;

/// <summary>
/// Reads the current user from the HTTP request context. Returns null-shaped values when
/// called outside an HTTP request (background jobs, hosted services) — those code paths run
/// as "system" and are not customer-scoped.
/// </summary>
public interface ICurrentUserService
{
    Guid? UserId { get; }
    /// <summary>The B2B Customer record this user owns, when they logged in via phone+OTP.</summary>
    Guid? CustomerId { get; }
    IReadOnlyList<string> Roles { get; }

    bool HasStaffRole();

    /// <summary>True when the only role is Customer — used to scope queries to their own records.</summary>
    bool IsCustomerOnly { get; }
}
