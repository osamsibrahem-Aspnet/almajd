using System.Security.Claims;
using Almajd.Application.DTOs.Fulfilment;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseOperator},{AppRoles.WarehouseManager},{AppRoles.OpsManager}")]
[Route("api/[controller]")]
public class PickListsController : ControllerBase
{
    private readonly IPickListService _picks;
    public PickListsController(IPickListService picks) => _picks = picks;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] PickListSearchQuery query)
    {
        var r = await _picks.SearchAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _picks.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("by-order/{orderId:guid}")]
    public async Task<IActionResult> GetByOrder(Guid orderId)
    {
        var r = await _picks.GetByOrderAsync(orderId);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("lines/{lineId:guid}/pick")]
    public async Task<IActionResult> PickLine(Guid lineId, [FromBody] PickLineInputDto dto)
    {
        var r = await _picks.PickLineAsync(lineId, dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("lines/{lineId:guid}/mark-short")]
    public async Task<IActionResult> MarkShort(Guid lineId, [FromBody] MarkShortInputDto dto)
    {
        var r = await _picks.MarkShortAsync(lineId, dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id)
    {
        var r = await _picks.CompleteAsync(id, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var r = await _picks.CancelAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    private Guid? CurrentUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
