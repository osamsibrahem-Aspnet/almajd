using Almajd.Application.DTOs.Auth;
using Almajd.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Almajd.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var r = await _auth.RegisterAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var r = await _auth.LoginAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    /// <summary>Request a phone OTP code. Throttled to 1 per minute per phone + IP rate-limiter.</summary>
    [HttpPost("otp/request")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpDto dto)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var r = await _auth.RequestOtpAsync(dto, ip);
        return StatusCode(r.StatusCode, r);
    }

    /// <summary>Verify a phone OTP code and receive a JWT. Creates a customer account on first verify.</summary>
    [HttpPost("otp/verify")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
    {
        var r = await _auth.VerifyOtpAsync(dto);
        return StatusCode(r.StatusCode, r);
    }
}
