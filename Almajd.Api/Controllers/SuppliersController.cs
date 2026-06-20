using Almajd.Application.DTOs.Purchasing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement},{AppRoles.OpsManager},{AppRoles.Accountant}")]
[Route("api/[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _suppliers;
    public SuppliersController(ISupplierService suppliers) => _suppliers = suppliers;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] SupplierSearchQuery query)
    {
        var r = await _suppliers.SearchAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _suppliers.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement}")]
    public async Task<IActionResult> Create([FromBody] SupplierCreateDto dto)
    {
        var r = await _suppliers.CreateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SupplierUpdateDto dto)
    {
        var r = await _suppliers.UpdateAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var r = await _suppliers.DeleteAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}/skus")]
    public async Task<IActionResult> ListSkus(Guid id)
    {
        var r = await _suppliers.ListSkusAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/skus")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement}")]
    public async Task<IActionResult> UpsertSku(Guid id, [FromBody] SupplierSkuUpsertDto dto)
    {
        var r = await _suppliers.UpsertSkuAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("{id:guid}/skus/{skuId:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Procurement}")]
    public async Task<IActionResult> RemoveSku(Guid id, Guid skuId)
    {
        var r = await _suppliers.RemoveSkuAsync(id, skuId);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("compare/{skuId:guid}")]
    public async Task<IActionResult> Compare(Guid skuId)
    {
        var r = await _suppliers.CompareSuppliersForSkuAsync(skuId);
        return StatusCode(r.StatusCode, r);
    }
}
