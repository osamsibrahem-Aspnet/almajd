using Almajd.Application.DTOs.Catalog;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Almajd.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _products;
    public ProductsController(IProductService products) => _products = products;

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Search([FromQuery] ProductSearchQuery query)
    {
        var r = await _products.SearchAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _products.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var r = await _products.GetBySlugAsync(slug);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> Create([FromBody] ProductCreateDto dto)
    {
        var r = await _products.CreateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ProductUpdateDto dto)
    {
        var r = await _products.UpdateAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var r = await _products.DeleteAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/status")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> ChangeStatus(Guid id, [FromQuery] ProductStatus status)
    {
        var r = await _products.ChangeStatusAsync(id, status);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/featured")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> SetFeatured(Guid id, [FromQuery] bool isFeatured)
    {
        var r = await _products.SetFeaturedAsync(id, isFeatured);
        return StatusCode(r.StatusCode, r);
    }

    // ---- SKUs ----
    [HttpPost("skus")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AddSku([FromBody] SkuCreateDto dto)
    {
        var r = await _products.AddSkuAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("skus/{skuId:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> UpdateSku(Guid skuId, [FromBody] SkuUpdateDto dto)
    {
        var r = await _products.UpdateSkuAsync(skuId, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("skus/{skuId:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> RemoveSku(Guid skuId)
    {
        var r = await _products.RemoveSkuAsync(skuId);
        return StatusCode(r.StatusCode, r);
    }

    // ---- Media ----
    [HttpPost("{id:guid}/media")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> AddMedia(Guid id, IFormFile file)
    {
        var r = await _products.AddMediaAsync(id, file);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("media/{mediaId:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> RemoveMedia(Guid mediaId)
    {
        var r = await _products.RemoveMediaAsync(mediaId);
        return StatusCode(r.StatusCode, r);
    }

    // ---- Bulk import ----
    [HttpPost("import")]
    [Authorize(Roles = AppRoles.Admin)]
    [RequestSizeLimit(20_000_000)] // 20 MB
    public async Task<IActionResult> BulkImport(IFormFile file)
    {
        var r = await _products.BulkImportAsync(file);
        return StatusCode(r.StatusCode, r);
    }
}
