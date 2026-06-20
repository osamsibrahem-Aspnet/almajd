using Almajd.Application.Common;
using Almajd.Application.DTOs.Users;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Almajd.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class UserService : IUserService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly IUnitOfWork _uow;

    public UserService(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        IUnitOfWork uow)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _uow = uow;
    }

    public async Task<ApiResponse<PagedResult<UserListItemDto>>> SearchAsync(UserSearchQuery q)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        IQueryable<ApplicationUser> query = _userManager.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = $"%{q.Search.Trim()}%";
            query = query.Where(u =>
                (u.Email != null && EF.Functions.Like(u.Email, term)) ||
                (u.UserName != null && EF.Functions.Like(u.UserName, term)) ||
                (u.FullName != null && EF.Functions.Like(u.FullName, term)) ||
                (u.PhoneNumber != null && EF.Functions.Like(u.PhoneNumber, term)));
        }

        if (q.IsLockedOut == true)
            query = query.Where(u => u.LockoutEnd != null && u.LockoutEnd > DateTimeOffset.UtcNow);

        var total = await query.CountAsync();
        var users = await query
            .OrderBy(u => u.Email ?? u.UserName)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        var customerIds = users.Where(u => u.CustomerId.HasValue).Select(u => u.CustomerId!.Value).Distinct().ToList();
        var customerNames = customerIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _uow.Repository<Customer>().Query()
                .Where(c => customerIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.TradeName ?? c.LegalName);

        var items = new List<UserListItemDto>(users.Count);
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            if (!string.IsNullOrWhiteSpace(q.Role) && !roles.Contains(q.Role)) continue;

            items.Add(new UserListItemDto
            {
                Id = u.Id,
                Email = u.Email,
                UserName = u.UserName,
                FullName = u.FullName,
                PhoneNumber = u.PhoneNumber,
                EmailConfirmed = u.EmailConfirmed,
                PhoneNumberConfirmed = u.PhoneNumberConfirmed,
                IsLockedOut = u.LockoutEnd is { } end && end > DateTimeOffset.UtcNow,
                IsDeleted = u.IsDeleted,
                CustomerId = u.CustomerId,
                CustomerName = u.CustomerId is { } cid && customerNames.TryGetValue(cid, out var n) ? n : null,
                Roles = roles.ToList(),
                CreatedAt = u.CreatedAt
            });
        }

        return ApiResponse<PagedResult<UserListItemDto>>.Ok(new PagedResult<UserListItemDto>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<UserDetailDto>> GetAsync(Guid id)
    {
        var u = await _userManager.FindByIdAsync(id.ToString());
        if (u is null) return ApiResponse<UserDetailDto>.Fail(404, "User not found.");

        var roles = await _userManager.GetRolesAsync(u);
        string? customerName = null;
        if (u.CustomerId.HasValue)
        {
            var c = await _uow.Repository<Customer>().GetByIdAsync(u.CustomerId.Value);
            customerName = c?.TradeName ?? c?.LegalName;
        }

        return ApiResponse<UserDetailDto>.Ok(new UserDetailDto
        {
            Id = u.Id,
            Email = u.Email,
            UserName = u.UserName,
            FullName = u.FullName,
            PhoneNumber = u.PhoneNumber,
            EmailConfirmed = u.EmailConfirmed,
            PhoneNumberConfirmed = u.PhoneNumberConfirmed,
            IsLockedOut = u.LockoutEnd is { } end && end > DateTimeOffset.UtcNow,
            IsDeleted = u.IsDeleted,
            CustomerId = u.CustomerId,
            CustomerName = customerName,
            Roles = roles.ToList(),
            CreatedAt = u.CreatedAt,
            UpdatedAt = u.UpdatedAt,
            AccessFailedCount = u.AccessFailedCount,
            LockoutEnd = u.LockoutEnd
        });
    }

    public async Task<ApiResponse<UserDetailDto>> CreateStaffAsync(CreateStaffUserDto dto)
    {
        if (await _userManager.FindByEmailAsync(dto.Email) is not null)
            return ApiResponse<UserDetailDto>.Fail(409, "An account with this email already exists.");

        // Reject Customer role for staff creation — customers use OTP flow only
        var bad = dto.Roles.Where(r => r == AppRoles.Customer).ToList();
        if (bad.Count > 0)
            return ApiResponse<UserDetailDto>.Fail(400, "The Customer role is reserved for OTP-created accounts.");

        var unknown = dto.Roles.Where(r => !AppRoles.All.Contains(r)).ToList();
        if (unknown.Count > 0)
            return ApiResponse<UserDetailDto>.Fail(400, $"Unknown roles: {string.Join(", ", unknown)}.");

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FullName = dto.FullName,
            PhoneNumber = dto.PhoneNumber,
            EmailConfirmed = true
        };

        var create = await _userManager.CreateAsync(user, dto.Password);
        if (!create.Succeeded)
            return ApiResponse<UserDetailDto>.Fail(400, "Failed to create user.",
                create.Errors.Select(e => e.Description).ToList());

        await _userManager.AddToRolesAsync(user, dto.Roles);

        return await GetAsync(user.Id);
    }

    public async Task<ApiResponse<UserDetailDto>> SetRolesAsync(Guid id, SetUserRolesDto dto)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return ApiResponse<UserDetailDto>.Fail(404, "User not found.");

        if (dto.Roles.Contains(AppRoles.Customer))
            return ApiResponse<UserDetailDto>.Fail(400, "The Customer role is reserved for OTP-created accounts.");

        var unknown = dto.Roles.Where(r => !AppRoles.All.Contains(r)).ToList();
        if (unknown.Count > 0)
            return ApiResponse<UserDetailDto>.Fail(400, $"Unknown roles: {string.Join(", ", unknown)}.");

        var current = await _userManager.GetRolesAsync(user);
        var toRemove = current.Where(r => r != AppRoles.Customer && !dto.Roles.Contains(r)).ToList();
        var toAdd = dto.Roles.Where(r => !current.Contains(r)).ToList();

        if (toRemove.Count > 0) await _userManager.RemoveFromRolesAsync(user, toRemove);
        if (toAdd.Count > 0) await _userManager.AddToRolesAsync(user, toAdd);

        return await GetAsync(id);
    }

    public async Task<ApiResponse> DeactivateAsync(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return ApiResponse.Fail(404, "User not found.");

        await _userManager.SetLockoutEnabledAsync(user, true);
        await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);
        return ApiResponse.Ok("User deactivated.");
    }

    public async Task<ApiResponse> ActivateAsync(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return ApiResponse.Fail(404, "User not found.");

        await _userManager.SetLockoutEndDateAsync(user, null);
        return ApiResponse.Ok("User activated.");
    }

    public Task<ApiResponse<IReadOnlyList<string>>> ListRolesAsync()
    {
        IReadOnlyList<string> roles = AppRoles.All.Where(r => r != AppRoles.Customer).ToList();
        return Task.FromResult(ApiResponse<IReadOnlyList<string>>.Ok(roles));
    }
}
