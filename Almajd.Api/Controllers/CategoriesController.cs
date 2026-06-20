using Almajd.Application.DTOs.Catalog;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categories;
    public CategoriesController(ICategoryService categories) => _categories = categories;

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List([FromQuery] bool includeInactive = false)
    {
        var r = await _categories.ListAsync(includeInactive);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("tree")]
    [AllowAnonymous]
    public async Task<IActionResult> Tree([FromQuery] bool includeInactive = false)
    {
        var r = await _categories.ListTreeAsync(includeInactive);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _categories.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Create([FromBody] CategoryCreateDto dto)
    {
        var r = await _categories.CreateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] CategoryUpdateDto dto)
    {
        var r = await _categories.UpdateAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var r = await _categories.DeleteAsync(id);
        return StatusCode(r.StatusCode, r);
    }
}
