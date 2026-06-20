using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Almajd.Infrastructure.Auth;

public class JwtService : IJwtService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _config;

    public JwtService(UserManager<ApplicationUser> userManager, IConfiguration config)
    {
        _userManager = userManager;
        _config = config;
    }

    public async Task<string> CreateTokenAsync(ApplicationUser user)
    {
        var key = _config["JWT:Key"]
            ?? throw new InvalidOperationException("JWT:Key is not configured.");
        var issuer = _config["JWT:Issuer"];
        var audience = _config["JWT:Audience"];
        var days = int.TryParse(_config["JWT:DurationInDays"], out var d) ? d : 3;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.UserName ?? user.Email ?? string.Empty)
        };

        if (!string.IsNullOrWhiteSpace(user.FullName))
            claims.Add(new Claim("fullName", user.FullName));

        if (user.CustomerId.HasValue)
            claims.Add(new Claim("customer_id", user.CustomerId.Value.ToString()));

        foreach (var role in await _userManager.GetRolesAsync(user))
            claims.Add(new Claim(ClaimTypes.Role, role));

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(days),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
