using System.Security.Claims;
using Almajd.Application.DTOs.Fulfilment;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager},{AppRoles.WarehouseOperator},{AppRoles.OpsManager},{AppRoles.SalesRep}")]
[Route("api/[controller]")]
public class ShipmentsController : ControllerBase
{
    private readonly IShipmentService _shipments;
    public ShipmentsController(IShipmentService shipments) => _shipments = shipments;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] ShipmentSearchQuery query)
    {
        var r = await _shipments.SearchAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _shipments.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("by-number/{number}")]
    public async Task<IActionResult> GetByNumber(string number)
    {
        var r = await _shipments.GetByNumberAsync(number);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> Create([FromBody] ShipmentCreateDto dto)
    {
        var r = await _shipments.CreateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/assign-driver")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> AssignDriver(Guid id, [FromBody] AssignDriverDto dto)
    {
        var r = await _shipments.AssignDriverAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/dispatch")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> Dispatch(Guid id)
    {
        var r = await _shipments.DispatchAsync(id, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/deliver")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager},{AppRoles.WarehouseOperator}")]
    public async Task<IActionResult> Deliver(Guid id, [FromBody] DeliverDto dto)
    {
        var r = await _shipments.DeliverAsync(id, dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelShipmentDto dto)
    {
        var r = await _shipments.CancelAsync(id, dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    private Guid? CurrentUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
