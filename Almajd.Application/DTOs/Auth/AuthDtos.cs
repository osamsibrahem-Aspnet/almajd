using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Auth;

public class RegisterDto
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = default!;

    [Required, StringLength(128, MinimumLength = 8)]
    public string Password { get; set; } = default!;

    [Required, StringLength(128)]
    public string FullName { get; set; } = default!;

    [Phone]
    public string? PhoneNumber { get; set; }
}

public class LoginDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = default!;

    [Required]
    public string Password { get; set; } = default!;
}

public class AuthResponseDto
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = default!;
    public string? FullName { get; set; }
    public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();
    public string Token { get; set; } = default!;
    public DateTime ExpiresAt { get; set; }
}
