using System.Security.Claims;
using Almajd.Application.DTOs.Sales;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orders;
    public OrdersController(IOrderService orders) => _orders = orders;

    [HttpGet]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep},{AppRoles.Accountant},{AppRoles.OpsManager},{AppRoles.WarehouseManager},{AppRoles.WarehouseOperator}")]
    public async Task<IActionResult> Search([FromQuery] OrderSearchQuery query)
    {
        var r = await _orders.SearchAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _orders.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("by-number/{number}")]
    public async Task<IActionResult> GetByNumber(string number)
    {
        var r = await _orders.GetByNumberAsync(number);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep},{AppRoles.Customer}")]
    public async Task<IActionResult> CreateDraft([FromBody] OrderCreateDto dto)
    {
        var r = await _orders.CreateDraftAsync(dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep},{AppRoles.Customer}")]
    public async Task<IActionResult> UpdateDraft(Guid id, [FromBody] OrderUpdateDraftDto dto)
    {
        var r = await _orders.UpdateDraftAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/submit")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep},{AppRoles.Customer}")]
    public async Task<IActionResult> Submit(Guid id)
    {
        var r = await _orders.SubmitAsync(id, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.OpsManager}")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var r = await _orders.ApproveAsync(id, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep},{AppRoles.OpsManager},{AppRoles.Customer}")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelOrderDto dto)
    {
        var r = await _orders.CancelAsync(id, dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/reorder")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep},{AppRoles.Customer}")]
    public async Task<IActionResult> Reorder(Guid id)
    {
        var r = await _orders.ReorderAsync(id, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    private Guid? CurrentUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
