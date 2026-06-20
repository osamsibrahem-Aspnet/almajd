using Almajd.Application.DTOs.Catalog;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class BrandsController : ControllerBase
{
    private readonly IBrandService _brands;
    public BrandsController(IBrandService brands) => _brands = brands;

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List([FromQuery] bool includeInactive = false)
    {
        var r = await _brands.ListAsync(includeInactive);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _brands.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Create([FromBody] BrandCreateDto dto)
    {
        var r = await _brands.CreateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] BrandUpdateDto dto)
    {
        var r = await _brands.UpdateAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var r = await _brands.DeleteAsync(id);
        return StatusCode(r.StatusCode, r);
    }
}
