using System.Security.Claims;
using Almajd.Application.DTOs.Inventory;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventory;

    public InventoryController(IInventoryService inventory) => _inventory = inventory;

    [HttpGet("stock")]
    public async Task<IActionResult> SearchStock([FromQuery] StockSearchQuery query)
    {
        var r = await _inventory.SearchStockAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("movements")]
    public async Task<IActionResult> SearchMovements([FromQuery] MovementSearchQuery query)
    {
        var r = await _inventory.SearchMovementsAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("receive")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseOperator},{AppRoles.WarehouseManager},{AppRoles.Procurement}")]
    public async Task<IActionResult> Receive([FromBody] ReceiveStockDto dto)
    {
        var r = await _inventory.ReceiveAsync(dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("adjust")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> Adjust([FromBody] AdjustStockDto dto)
    {
        var r = await _inventory.AdjustAsync(dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("transfer")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseOperator},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> Transfer([FromBody] TransferStockDto dto)
    {
        var r = await _inventory.TransferAsync(dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("reserve")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> Reserve([FromBody] ReserveStockDto dto)
    {
        var r = await _inventory.ReserveAsync(dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("release")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> Release([FromBody] ReserveStockDto dto)
    {
        var r = await _inventory.ReleaseAsync(dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("confirm-sale")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.WarehouseOperator},{AppRoles.WarehouseManager}")]
    public async Task<IActionResult> ConfirmSale([FromBody] ConfirmSaleDto dto)
    {
        var r = await _inventory.ConfirmSaleAsync(dto, CurrentUserId());
        return StatusCode(r.StatusCode, r);
    }

    private Guid? CurrentUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
