using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement},{AppRoles.OpsManager}")]
[Route("api/[controller]")]
public class ReplenishmentController : ControllerBase
{
    private readonly IReplenishmentService _replenishment;
    public ReplenishmentController(IReplenishmentService replenishment) => _replenishment = replenishment;

    [HttpGet("suggestions")]
    public async Task<IActionResult> Suggestions([FromQuery] Guid? supplierId)
    {
        var r = await _replenishment.ListSuggestionsAsync(supplierId);
        return StatusCode(r.StatusCode, r);
    }
}
