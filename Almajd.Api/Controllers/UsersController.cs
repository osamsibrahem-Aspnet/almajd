using Almajd.Application.DTOs.Users;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = AppRoles.Admin)]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _users;
    public UsersController(IUserService users) => _users = users;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] UserSearchQuery query)
    {
        var r = await _users.SearchAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _users.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStaffUserDto dto)
    {
        var r = await _users.CreateStaffAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}/roles")]
    public async Task<IActionResult> SetRoles(Guid id, [FromBody] SetUserRolesDto dto)
    {
        var r = await _users.SetRolesAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/deactivate")]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var r = await _users.DeactivateAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/activate")]
    public async Task<IActionResult> Activate(Guid id)
    {
        var r = await _users.ActivateAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("roles")]
    public async Task<IActionResult> ListRoles()
    {
        var r = await _users.ListRolesAsync();
        return StatusCode(r.StatusCode, r);
    }
}
