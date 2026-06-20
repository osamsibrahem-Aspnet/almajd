using System.Security.Claims;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Accountant}")]
[Route("api/[controller]")]
public class CreditNotesController : ControllerBase
{
    private readonly ICreditNoteService _creditNotes;
    public CreditNotesController(ICreditNoteService creditNotes) => _creditNotes = creditNotes;

    [HttpGet("invoice/{invoiceId:guid}")]
    public async Task<IActionResult> ListByInvoice(Guid invoiceId)
    {
        var r = await _creditNotes.ListByInvoiceAsync(invoiceId);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreditNoteCreateDto dto)
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(raw, out var parsed) ? parsed : null;

        var r = await _creditNotes.CreateAsync(dto, userId);
        return StatusCode(r.StatusCode, r);
    }
}
