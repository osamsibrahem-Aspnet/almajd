using Almajd.Application.DTOs.Inventory;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class WarehousesController : ControllerBase
{
    private readonly IWarehouseService _warehouses;
    private readonly ILocationService _locations;

    public WarehousesController(IWarehouseService warehouses, ILocationService locations)
    {
        _warehouses = warehouses;
        _locations = locations;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool includeInactive = false)
    {
        var r = await _warehouses.ListAsync(includeInactive);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _warehouses.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Create([FromBody] WarehouseCreateDto dto)
    {
        var r = await _warehouses.CreateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] WarehouseUpdateDto dto)
    {
        var r = await _warehouses.UpdateAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var r = await _warehouses.DeleteAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}/locations")]
    public async Task<IActionResult> ListLocations(Guid id)
    {
        var r = await _locations.ListByWarehouseAsync(id);
        return StatusCode(r.StatusCode, r);
    }
}
