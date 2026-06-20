using Almajd.Application.DTOs.Sales;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep},{AppRoles.OpsManager},{AppRoles.Accountant}")]
[Route("api/[controller]")]
public class PriceListsController : ControllerBase
{
    private readonly IPriceListService _priceLists;
    public PriceListsController(IPriceListService priceLists) => _priceLists = priceLists;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool includeInactive = false)
    {
        var r = await _priceLists.ListAsync(includeInactive);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _priceLists.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Create([FromBody] PriceListCreateDto dto)
    {
        var r = await _priceLists.CreateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] PriceListUpdateDto dto)
    {
        var r = await _priceLists.UpdateAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var r = await _priceLists.DeleteAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/lines")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> UpsertLine(Guid id, [FromBody] PriceListLineUpsertDto dto)
    {
        var r = await _priceLists.UpsertLineAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("{id:guid}/lines/{skuId:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> RemoveLine(Guid id, Guid skuId)
    {
        var r = await _priceLists.RemoveLineAsync(id, skuId);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("customers/{customerId:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> AssignToCustomer(Guid customerId, [FromBody] CustomerPriceListAssignDto dto)
    {
        var r = await _priceLists.AssignToCustomerAsync(customerId, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("customers/{customerId:guid}/{priceListId:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> UnassignFromCustomer(Guid customerId, Guid priceListId)
    {
        var r = await _priceLists.UnassignFromCustomerAsync(customerId, priceListId);
        return StatusCode(r.StatusCode, r);
    }
}
