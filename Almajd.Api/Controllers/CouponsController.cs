using Almajd.Application.DTOs.Sales;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep},{AppRoles.OpsManager}")]
[Route("api/[controller]")]
public class CouponsController : ControllerBase
{
    private readonly ICouponService _coupons;
    public CouponsController(ICouponService coupons) => _coupons = coupons;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool includeInactive = false)
    {
        var r = await _coupons.ListAsync(includeInactive);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("by-code/{code}")]
    public async Task<IActionResult> GetByCode(string code)
    {
        var r = await _coupons.GetByCodeAsync(code);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Create([FromBody] CouponCreateDto dto)
    {
        var r = await _coupons.CreateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] CouponUpdateDto dto)
    {
        var r = await _coupons.UpdateAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var r = await _coupons.DeleteAsync(id);
        return StatusCode(r.StatusCode, r);
    }
}
