using System.Security.Claims;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Http;

namespace Almajd.Infrastructure.Auth;

public class CurrentUserService : ICurrentUserService
{
    private static readonly HashSet<string> StaffRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        AppRoles.Admin,
        AppRoles.SalesRep,
        AppRoles.WarehouseOperator,
        AppRoles.WarehouseManager,
        AppRoles.Procurement,
        AppRoles.Accountant,
        AppRoles.OpsManager
    };

    private readonly IHttpContextAccessor _ctx;

    public CurrentUserService(IHttpContextAccessor ctx) => _ctx = ctx;

    public Guid? UserId
    {
        get
        {
            var raw = _ctx.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    public Guid? CustomerId
    {
        get
        {
            var raw = _ctx.HttpContext?.User?.FindFirst("customer_id")?.Value;
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    public IReadOnlyList<string> Roles =>
        _ctx.HttpContext?.User?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList()
        ?? (IReadOnlyList<string>)Array.Empty<string>();

    public bool HasStaffRole() => Roles.Any(r => StaffRoles.Contains(r));

    public bool IsCustomerOnly => Roles.Contains(AppRoles.Customer) && !HasStaffRole();
}
