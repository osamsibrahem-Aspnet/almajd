using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Auth;

public class RequestOtpDto
{
    /// <summary>Phone in E.164 format (e.g. +201012345678).</summary>
    [Required, Phone, StringLength(32)]
    public string Phone { get; set; } = default!;
}

public class VerifyOtpDto
{
    [Required, Phone, StringLength(32)]
    public string Phone { get; set; } = default!;

    [Required, RegularExpression("^[0-9]{6}$", ErrorMessage = "Code must be 6 digits.")]
    public string Code { get; set; } = default!;
}
