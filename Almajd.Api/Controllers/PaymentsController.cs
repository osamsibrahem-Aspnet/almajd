using System.Security.Claims;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Accountant},{AppRoles.OpsManager}")]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _payments;
    public PaymentsController(IPaymentService payments) => _payments = payments;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] PaymentSearchQuery query)
    {
        var r = await _payments.SearchAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _payments.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Accountant}")]
    public async Task<IActionResult> Record([FromBody] PaymentCreateDto dto)
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(raw, out var parsed) ? parsed : null;

        var r = await _payments.RecordAsync(dto, userId);
        return StatusCode(r.StatusCode, r);
    }
}
