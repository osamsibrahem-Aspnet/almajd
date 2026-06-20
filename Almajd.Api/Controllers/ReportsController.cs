using Almajd.Application.DTOs.Reports;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.OpsManager},{AppRoles.Accountant},{AppRoles.SalesRep}")]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reports;
    public ReportsController(IReportService reports) => _reports = reports;

    [HttpGet("sales")]
    public async Task<IActionResult> Sales([FromQuery] SalesReportQuery query)
    {
        var r = await _reports.SalesAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("profit-by-product")]
    public async Task<IActionResult> ProfitByProduct([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var r = await _reports.ProfitByProductAsync(from, to);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("top-customers")]
    public async Task<IActionResult> TopCustomers([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int top = 20)
    {
        var r = await _reports.TopCustomersAsync(from, to, top);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("supplier-spend")]
    public async Task<IActionResult> SupplierSpend([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var r = await _reports.SupplierSpendAsync(from, to);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("kpis")]
    public async Task<IActionResult> OperationalKpis()
    {
        var r = await _reports.OperationalKpisAsync();
        return StatusCode(r.StatusCode, r);
    }
}
