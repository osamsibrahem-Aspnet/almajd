using System.Security.Claims;
using Almajd.Application.DTOs.Purchasing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement},{AppRoles.WarehouseManager},{AppRoles.WarehouseOperator}")]
[Route("api/[controller]")]
public class GoodsReceiptsController : ControllerBase
{
    private readonly IGoodsReceiptService _receipts;
    public GoodsReceiptsController(IGoodsReceiptService receipts) => _receipts = receipts;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] GoodsReceiptSearchQuery query)
    {
        var r = await _receipts.SearchAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _receipts.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] GoodsReceiptCreateDto dto)
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(raw, out var parsed) ? parsed : null;
        var r = await _receipts.CreateAsync(dto, userId);
        return StatusCode(r.StatusCode, r);
    }
}
