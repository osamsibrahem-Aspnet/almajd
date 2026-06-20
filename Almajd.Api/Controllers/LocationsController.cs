using Almajd.Application.DTOs.Inventory;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class LocationsController : ControllerBase
{
    private readonly ILocationService _locations;
    public LocationsController(ILocationService locations) => _locations = locations;

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _locations.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> Create([FromBody] LocationCreateDto dto)
    {
        var r = await _locations.CreateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] LocationUpdateDto dto)
    {
        var r = await _locations.UpdateAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var r = await _locations.DeleteAsync(id);
        return StatusCode(r.StatusCode, r);
    }
}
