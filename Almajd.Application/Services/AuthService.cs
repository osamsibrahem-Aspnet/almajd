using Almajd.Application.Common;
using Almajd.Application.DTOs.Auth;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Almajd.Domain.Entities;
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Security.Cryptography;
using System.Text;

namespace Almajd.Application.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IJwtService _jwt;
    private readonly IMapper _mapper;
    private readonly IConfiguration _config;
    private readonly IUnitOfWork _uow;
    private readonly ISmsSender _sms;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IJwtService jwt,
        IMapper mapper,
        IConfiguration config,
        IUnitOfWork uow,
        ISmsSender sms,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwt = jwt;
        _mapper = mapper;
        _config = config;
        _uow = uow;
        _sms = sms;
        _logger = logger;
    }

    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterDto dto)
    {
        if (await _userManager.FindByEmailAsync(dto.Email) is not null)
            return ApiResponse<AuthResponseDto>.Fail(409, "An account with this email already exists.");

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FullName = dto.FullName,
            PhoneNumber = dto.PhoneNumber,
            EmailConfirmed = false
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return ApiResponse<AuthResponseDto>.Fail(400, "Registration failed.",
                result.Errors.Select(e => e.Description).ToList());

        await _userManager.AddToRoleAsync(user, AppRoles.Customer);

        return await BuildAuthResponseAsync(user, 201);
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user is null)
            return ApiResponse<AuthResponseDto>.Fail(401, "Invalid credentials.");

        var check = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);

        if (check.IsLockedOut)
            return ApiResponse<AuthResponseDto>.Fail(423, "Account is temporarily locked. Try again later.");

        if (!check.Succeeded)
            return ApiResponse<AuthResponseDto>.Fail(401, "Invalid credentials.");

        return await BuildAuthResponseAsync(user, 200);
    }

    // ---------------- OTP ----------------

    public async Task<ApiResponse> RequestOtpAsync(RequestOtpDto dto, string? clientIp)
    {
        var phone = NormalizePhone(dto.Phone);
        if (phone is null) return ApiResponse.Fail(400, "Phone must be in E.164 format (e.g. +201012345678).");

        // Throttle: deny if a challenge was issued in the last 60 seconds
        var lastIssuedAt = await _uow.Repository<OtpChallenge>().Query()
            .Where(c => c.PhoneE164 == phone)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => (DateTime?)c.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastIssuedAt.HasValue && DateTime.UtcNow - lastIssuedAt.Value < TimeSpan.FromSeconds(60))
            return ApiResponse.Fail(429, "Please wait a minute before requesting another code.");

        // Invalidate any active challenges (one valid code at a time per phone)
        var active = await _uow.Repository<OtpChallenge>()
            .FindAsync(c => c.PhoneE164 == phone && c.VerifiedAt == null && c.ExpiresAt > DateTime.UtcNow);
        foreach (var old in active)
        {
            old.ExpiresAt = DateTime.UtcNow;
            _uow.Repository<OtpChallenge>().Update(old);
        }

        var codeLength = int.TryParse(_config["Otp:CodeLength"], out var cl) ? cl : 6;
        var expiryMinutes = int.TryParse(_config["Otp:ExpiryMinutes"], out var em) ? em : 5;
        var maxAttempts = int.TryParse(_config["Otp:MaxAttempts"], out var ma) ? ma : 5;

        var code = GenerateCode(codeLength);
        var challenge = new OtpChallenge
        {
            PhoneE164 = phone,
            CodeHash = HashCode(phone, code),
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
            AttemptsRemaining = maxAttempts,
            Ip = clientIp
        };

        await _uow.Repository<OtpChallenge>().AddAsync(challenge);
        await _uow.CompleteAsync();

        try
        {
            await _sms.SendAsync(phone, $"Your Almajd verification code is: {code}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send OTP SMS to {Phone}", phone);
            return ApiResponse.Fail(500, "Failed to deliver SMS. Try again shortly.");
        }

        return ApiResponse.Ok($"Code sent {code}. Expires in {expiryMinutes} minutes.");
    }

    public async Task<ApiResponse<AuthResponseDto>> VerifyOtpAsync(VerifyOtpDto dto)
    {
        var phone = NormalizePhone(dto.Phone);
        if (phone is null)
            return ApiResponse<AuthResponseDto>.Fail(400, "Phone must be in E.164 format.");

        var challenge = await _uow.Repository<OtpChallenge>().Query()
            .Where(c => c.PhoneE164 == phone && c.VerifiedAt == null && c.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();

        if (challenge is null)
            return ApiResponse<AuthResponseDto>.Fail(404, "No active code for this phone. Request a new one.");

        if (challenge.AttemptsRemaining <= 0)
        {
            challenge.ExpiresAt = DateTime.UtcNow; // burn it
            _uow.Repository<OtpChallenge>().Update(challenge);
            await _uow.CompleteAsync();
            return ApiResponse<AuthResponseDto>.Fail(429, "Too many attempts. Request a new code.");
        }

        var expectedHash = HashCode(phone, dto.Code);
        if (!FixedTimeEquals(expectedHash, challenge.CodeHash))
        {
            challenge.AttemptsRemaining--;
            _uow.Repository<OtpChallenge>().Update(challenge);
            await _uow.CompleteAsync();
            return ApiResponse<AuthResponseDto>.Fail(401,
                $"Invalid code. {challenge.AttemptsRemaining} attempt(s) remaining.");
        }

        challenge.VerifiedAt = DateTime.UtcNow;
        _uow.Repository<OtpChallenge>().Update(challenge);

        // Find or create a customer user keyed by phone (UserName = phone for OTP-only accounts).
        // Identity has RequireUniqueEmail = true which also forbids null/empty emails. OTP-only
        // customers have no real email, so we give them a synthetic one keyed by phone digits.
        // EmailConfirmed stays false — they can fill in a real email later via /api/customers/{id}.
        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone);
        var newlyCreated = false;
        if (user is null)
        {
            var syntheticEmail = $"phone{phone.Replace("+", "").Replace(" ", "")}@phone.almajd.local";
            user = new ApplicationUser
            {
                UserName = phone,
                PhoneNumber = phone,
                Email = syntheticEmail,
                NormalizedEmail = syntheticEmail.ToUpperInvariant(),
                PhoneNumberConfirmed = true,
                EmailConfirmed = false,
                FullName = null
            };
            var create = await _userManager.CreateAsync(user);
            if (!create.Succeeded)
                return ApiResponse<AuthResponseDto>.Fail(500,
                    "Failed to create user.", create.Errors.Select(e => e.Description).ToList());

            await _userManager.AddToRoleAsync(user, AppRoles.Customer);
            newlyCreated = true;
        }
        else if (!user.PhoneNumberConfirmed)
        {
            user.PhoneNumberConfirmed = true;
            await _userManager.UpdateAsync(user);
        }

        // Link to a Customer record. Create a stub on first verify; user fills in profile later.
        if (user.CustomerId is null)
        {
            var customer = new Customer
            {
                Code = await NextCustomerCodeAsync(),
                LegalName = $"Customer {phone}",
                Phone = phone,
                Status = Domain.Enums.CustomerStatus.Active,
                Tier = Domain.Enums.CustomerTier.Small,
                PaymentTermsNetDays = 0,
                CreditLimit = 0,
                CurrentAr = 0
            };
            await _uow.Repository<Customer>().AddAsync(customer);
            await _uow.CompleteAsync();

            user.CustomerId = customer.Id;
            var update = await _userManager.UpdateAsync(user);
            if (!update.Succeeded)
                _logger.LogWarning("Failed to link user {UserId} to customer {CustomerId}",
                    user.Id, customer.Id);
        }
        else
        {
            await _uow.CompleteAsync();
        }

        return await BuildAuthResponseAsync(user, newlyCreated ? 201 : 200);
    }

    private async Task<string> NextCustomerCodeAsync()
    {
        // Inline copy of CustomerService.NextCustomerCodeAsync — calling that service would risk a cyclic dependency.
        var lastCode = await _uow.Repository<Customer>().Query()
            .OrderByDescending(c => c.Code)
            .Select(c => c.Code)
            .FirstOrDefaultAsync();

        var nextNum = 1;
        if (!string.IsNullOrWhiteSpace(lastCode) && lastCode.StartsWith("CUST-") &&
            int.TryParse(lastCode.AsSpan(5), out var parsed))
        {
            nextNum = parsed + 1;
        }

        return $"CUST-{nextNum:D5}";
    }

    // ---------------- helpers ----------------

    private async Task<ApiResponse<AuthResponseDto>> BuildAuthResponseAsync(ApplicationUser user, int statusCode)
    {
        try
        {
            var token = await _jwt.CreateTokenAsync(user);
            var roles = await _userManager.GetRolesAsync(user);
            var days = int.TryParse(_config["JWT:DurationInDays"], out var d) ? d : 3;

            var dto = _mapper.Map<AuthResponseDto>(user);
            var response = new AuthResponseDto
            {
                UserId = dto.UserId,
                Email = dto.Email,
                FullName = dto.FullName,
                Roles = roles.ToList(),
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddDays(days)
            };

            return statusCode == 201
                ? ApiResponse<AuthResponseDto>.Created(response, "Account created.")
                : ApiResponse<AuthResponseDto>.Ok(response, "Signed in.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to build auth response for user {UserId} ({Email}). " +
                "Likely cause: JWT:Key missing/too-short, or AutoMapper profile failure.",
                user.Id, user.Email);

            return ApiResponse<AuthResponseDto>.Fail(500,
                "Authentication succeeded but token issuance failed. Check server logs and JWT configuration.");
        }
    }



    private static string? NormalizePhone(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var trimmed = raw.Trim().Replace(" ", "").Replace("-", "");
        // E.164: '+' followed by 8-15 digits, country code first digit 1-9
        if (!System.Text.RegularExpressions.Regex.IsMatch(trimmed, @"^\+[1-9][0-9]{7,14}$"))
            return null;
        return trimmed;
    }

    private static string GenerateCode(int length)
    {
        if (length is < 4 or > 10) length = 6;
        var bytes = new byte[4];
        RandomNumberGenerator.Fill(bytes);
        var n = BitConverter.ToUInt32(bytes, 0);
        var max = (int)Math.Pow(10, length);
        return (n % max).ToString().PadLeft(length, '0');
    }

    private string HashCode(string phone, string code)
    {
        var pepper = _config["Otp:HashKey"] ?? _config["JWT:Key"]
            ?? throw new InvalidOperationException("Otp:HashKey (or JWT:Key fallback) is not configured.");
        var keyBytes = Encoding.UTF8.GetBytes(pepper);
        var messageBytes = Encoding.UTF8.GetBytes($"{phone}|{code}");
        using var hmac = new HMACSHA256(keyBytes);
        return Convert.ToBase64String(hmac.ComputeHash(messageBytes));
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        var aBytes = Encoding.UTF8.GetBytes(a);
        var bBytes = Encoding.UTF8.GetBytes(b);
        return CryptographicOperations.FixedTimeEquals(aBytes, bBytes);
    }
}
