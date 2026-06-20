using System.Security.Claims;
using Almajd.Application.DTOs.Notifications;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Almajd.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notifications;
    public NotificationsController(INotificationService notifications) => _notifications = notifications;

    // ----- inbox (any signed-in user reads their own) -----
    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox([FromQuery] NotificationSearchQuery query)
    {
        var uid = CurrentUserId();
        if (uid is null) return Unauthorized();
        var r = await _notifications.InboxAsync(uid.Value, query);
        return StatusCode(r.StatusCode, r);
    }

    // ----- preferences -----
    [HttpGet("preferences")]
    public async Task<IActionResult> Preferences()
    {
        var uid = CurrentUserId();
        if (uid is null) return Unauthorized();
        var r = await _notifications.ListPreferencesAsync(uid.Value);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("preferences")]
    public async Task<IActionResult> SetPreference(
        [FromQuery] NotificationCategory category,
        [FromQuery] NotificationChannel channel,
        [FromQuery] bool enabled)
    {
        var uid = CurrentUserId();
        if (uid is null) return Unauthorized();
        var r = await _notifications.SetPreferenceAsync(uid.Value, category, channel, enabled);
        return StatusCode(r.StatusCode, r);
    }

    // ----- device tokens -----
    [HttpPost("devices")]
    public async Task<IActionResult> RegisterDevice([FromBody] DeviceTokenRegisterDto dto)
    {
        var uid = CurrentUserId();
        if (uid is null) return Unauthorized();
        var r = await _notifications.RegisterDeviceTokenAsync(uid.Value, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("devices/{token}")]
    public async Task<IActionResult> RevokeDevice(string token)
    {
        var uid = CurrentUserId();
        if (uid is null) return Unauthorized();
        var r = await _notifications.RevokeDeviceTokenAsync(uid.Value, token);
        return StatusCode(r.StatusCode, r);
    }

    // ----- templates (admin) -----
    [HttpGet("templates")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> ListTemplates()
    {
        var r = await _notifications.ListTemplatesAsync();
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("templates")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> UpsertTemplate([FromBody] NotificationTemplateUpsertDto dto)
    {
        var r = await _notifications.UpsertTemplateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    private Guid? CurrentUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
