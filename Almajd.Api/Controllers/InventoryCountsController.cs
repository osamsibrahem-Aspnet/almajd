using System.Security.Claims;
using Almajd.Application.DTOs.Inventory;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager},{AppRoles.WarehouseOperator}")]
[Route("api/inventory/counts")]
public class InventoryCountsController : ControllerBase
{
    private readonly IInventoryCountService _counts;

    public InventoryCountsController(IInventoryCountService counts) => _counts = counts;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? warehouseId)
    {
        var r = await _counts.ListAsync(warehouseId);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _counts.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInventoryCountDto dto)
    {
        var r = await _counts.CreateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> Start(Guid id)
    {
        var r = await _counts.StartAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}/lines")]
    public async Task<IActionResult> SetLines(Guid id, [FromBody] List<CountLineInputDto> lines)
    {
        var r = await _counts.SetLinesAsync(id, lines);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/post")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> Post(Guid id)
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(raw, out var parsed) ? parsed : null;

        var r = await _counts.PostAsync(id, userId);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var r = await _counts.CancelAsync(id);
        return StatusCode(r.StatusCode, r);
    }
}
