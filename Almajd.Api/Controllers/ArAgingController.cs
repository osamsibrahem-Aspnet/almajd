using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Accountant},{AppRoles.OpsManager}")]
[Route("api/ar/aging")]
public class ArAgingController : ControllerBase
{
    private readonly IArAgingService _aging;
    public ArAgingController(IArAgingService aging) => _aging = aging;

    [HttpGet]
    public async Task<IActionResult> Report([FromQuery] DateTime? asOf)
    {
        var r = await _aging.ComputeAsync(asOf);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("customer/{customerId:guid}")]
    public async Task<IActionResult> ForCustomer(Guid customerId, [FromQuery] DateTime? asOf)
    {
        var r = await _aging.ForCustomerAsync(customerId, asOf);
        return StatusCode(r.StatusCode, r);
    }
}
