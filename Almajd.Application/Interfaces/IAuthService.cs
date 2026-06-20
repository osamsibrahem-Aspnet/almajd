using Almajd.Application.Common;
using Almajd.Application.DTOs.Auth;

namespace Almajd.Application.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterDto dto);
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginDto dto);

    /// <summary>Issues a 6-digit code to the phone number and sends it via SMS.</summary>
    Task<ApiResponse> RequestOtpAsync(RequestOtpDto dto, string? clientIp);

    /// <summary>Verifies the code, finds-or-creates a customer user, returns a JWT.</summary>
    Task<ApiResponse<AuthResponseDto>> VerifyOtpAsync(VerifyOtpDto dto);
}
