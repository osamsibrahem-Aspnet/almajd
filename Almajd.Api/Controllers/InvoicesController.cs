using Almajd.Application.DTOs.Billing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Accountant},{AppRoles.OpsManager},{AppRoles.SalesRep}")]
[Route("api/[controller]")]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoices;
    public InvoicesController(IInvoiceService invoices) => _invoices = invoices;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] InvoiceSearchQuery query)
    {
        var r = await _invoices.SearchAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _invoices.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("by-number/{number}")]
    public async Task<IActionResult> GetByNumber(string number)
    {
        var r = await _invoices.GetByNumberAsync(number);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("issue-from-order")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Accountant}")]
    public async Task<IActionResult> Issue([FromBody] IssueInvoiceFromOrderDto dto)
    {
        var r = await _invoices.IssueFromOrderAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/void")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Accountant}")]
    public async Task<IActionResult> Void(Guid id, [FromBody] VoidInvoiceDto dto)
    {
        var r = await _invoices.VoidAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}/pdf")]
    public async Task<IActionResult> ExportPdf(Guid id)
    {
        var r = await _invoices.ExportPdfAsync(id);
        if (!r.IsSuccess) return StatusCode(r.StatusCode, r);
        return File(r.Data!, "application/pdf", $"invoice-{id:N}.pdf");
    }
}
