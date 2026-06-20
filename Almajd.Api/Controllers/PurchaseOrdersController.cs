using System.Security.Claims;
using Almajd.Application.DTOs.Purchasing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement},{AppRoles.OpsManager},{AppRoles.WarehouseManager},{AppRoles.Accountant}")]
[Route("api/[controller]")]
public class PurchaseOrdersController : ControllerBase
{
    private readonly IPurchaseOrderService _pos;
    public PurchaseOrdersController(IPurchaseOrderService pos) => _pos = pos;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] PurchaseOrderSearchQuery query)
    {
        var r = await _pos.SearchAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _pos.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("by-number/{number}")]
    public async Task<IActionResult> GetByNumber(string number)
    {
        var r = await _pos.GetByNumberAsync(number);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement}")]
    public async Task<IActionResult> CreateDraft([FromBody] PurchaseOrderCreateDto dto)
    {
        var r = await _pos.CreateDraftAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement}")]
    public async Task<IActionResult> UpdateDraft(Guid id, [FromBody] PurchaseOrderUpdateDraftDto dto)
    {
        var r = await _pos.UpdateDraftAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/submit")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement}")]
    public async Task<IActionResult> Submit(Guid id)
    {
        var r = await _pos.SubmitAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.OpsManager}")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(raw, out var parsed) ? parsed : null;
        var r = await _pos.ApproveAsync(id, userId);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement},{AppRoles.OpsManager}")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelPurchaseOrderDto dto)
    {
        var r = await _pos.CancelAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }
}
