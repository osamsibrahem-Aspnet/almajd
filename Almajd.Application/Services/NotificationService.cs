using System.Text.Json;
using System.Text.RegularExpressions;
using Almajd.Application.Common;
using Almajd.Application.DTOs.Notifications;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Almajd.Application.Services;

public class NotificationService : INotificationService
{
    private static readonly Regex PlaceholderRegex = new(@"\{\{\s*(\w+)\s*\}\}", RegexOptions.Compiled);

    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly IEnumerable<INotificationChannel> _channels;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IUnitOfWork uow,
        IMapper mapper,
        IEnumerable<INotificationChannel> channels,
        UserManager<ApplicationUser> userManager,
        ILogger<NotificationService> logger)
    {
        _uow = uow;
        _mapper = mapper;
        _channels = channels;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task<ApiResponse> DispatchAsync(Guid userId, string templateCode, IDictionary<string, string> data)
    {
        var template = await _uow.Repository<NotificationTemplate>()
            .FirstOrDefaultAsync(t => t.Code == templateCode && t.IsActive);
        if (template is null)
        {
            _logger.LogWarning("Notification template {Code} not found or inactive.", templateCode);
            return ApiResponse.Fail(404, $"Template '{templateCode}' not found or inactive.");
        }

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null) return ApiResponse.Fail(404, "User not found.");

        var preferences = await _uow.Repository<UserNotificationPreference>()
            .FindAsync(p => p.UserId == userId && p.Category == template.Category);

        var title = Render(template.Title, data);
        var body = Render(template.Body, data);
        var payloadJson = JsonSerializer.Serialize(data);

        foreach (var channel in _channels)
        {
            // Per-user opt-in: if a row exists for this (Category, Channel), use it; else default = enabled
            var pref = preferences.FirstOrDefault(p => p.Channel == channel.Channel);
            var enabled = pref?.Enabled ?? true;

            var notification = new Notification
            {
                UserId = userId,
                TemplateCode = templateCode,
                Category = template.Category,
                Channel = channel.Channel,
                Status = enabled ? NotificationStatus.Pending : NotificationStatus.Suppressed,
                Title = title,
                Body = body,
                PayloadJson = payloadJson
            };

            if (enabled)
            {
                try
                {
                    var error = await channel.SendAsync(user, notification, CancellationToken.None);
                    if (error is null)
                    {
                        notification.Status = NotificationStatus.Sent;
                        notification.SentAt = DateTime.UtcNow;
                    }
                    else
                    {
                        notification.Status = NotificationStatus.Failed;
                        notification.Error = error;
                    }
                }
                catch (Exception ex)
                {
                    notification.Status = NotificationStatus.Failed;
                    notification.Error = ex.Message;
                    _logger.LogError(ex, "Notification {Code} via {Channel} failed for user {UserId}",
                        templateCode, channel.Channel, userId);
                }
            }

            await _uow.Repository<Notification>().AddAsync(notification);
        }

        await _uow.CompleteAsync();
        return ApiResponse.Ok();
    }

    public async Task<ApiResponse> BroadcastAsync(IEnumerable<Guid> userIds, string templateCode, IDictionary<string, string> data)
    {
        foreach (var userId in userIds.Distinct())
        {
            var r = await DispatchAsync(userId, templateCode, data);
            if (!r.IsSuccess)
                _logger.LogWarning("Broadcast to {UserId} failed: {Message}", userId, r.Message);
        }
        return ApiResponse.Ok();
    }

    public async Task<ApiResponse> DispatchToCustomerAsync(Guid customerId, string templateCode, IDictionary<string, string> data)
    {
        var userIds = await _userManager.Users
            .Where(u => u.CustomerId == customerId)
            .Select(u => u.Id)
            .ToListAsync();

        if (userIds.Count == 0)
        {
            _logger.LogInformation("No users linked to customer {CustomerId}; skipping {Code}.",
                customerId, templateCode);
            return ApiResponse.Ok();
        }

        return await BroadcastAsync(userIds, templateCode, data);
    }

    public async Task<ApiResponse<IReadOnlyList<NotificationTemplateDto>>> ListTemplatesAsync()
    {
        var items = await _uow.Repository<NotificationTemplate>().Query()
            .OrderBy(t => t.Category).ThenBy(t => t.Code)
            .ToListAsync();

        return ApiResponse<IReadOnlyList<NotificationTemplateDto>>.Ok(
            items.Select(_mapper.Map<NotificationTemplateDto>).ToList());
    }

    public async Task<ApiResponse<NotificationTemplateDto>> UpsertTemplateAsync(NotificationTemplateUpsertDto dto)
    {
        var code = dto.Code.Trim().ToUpperInvariant();
        var existing = await _uow.Repository<NotificationTemplate>()
            .FirstOrDefaultAsync(t => t.Code == code);

        if (existing is null)
        {
            existing = new NotificationTemplate
            {
                Code = code,
                Category = dto.Category,
                Title = dto.Title,
                Body = dto.Body,
                IsActive = dto.IsActive
            };
            await _uow.Repository<NotificationTemplate>().AddAsync(existing);
        }
        else
        {
            existing.Category = dto.Category;
            existing.Title = dto.Title;
            existing.Body = dto.Body;
            existing.IsActive = dto.IsActive;
            _uow.Repository<NotificationTemplate>().Update(existing);
        }

        await _uow.CompleteAsync();
        return ApiResponse<NotificationTemplateDto>.Ok(_mapper.Map<NotificationTemplateDto>(existing));
    }

    public async Task<ApiResponse<PagedResult<NotificationDto>>> InboxAsync(Guid userId, NotificationSearchQuery q)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        IQueryable<Notification> query = _uow.Repository<Notification>().Query()
            .Where(n => n.UserId == userId)
            .AsNoTracking();

        if (q.Status.HasValue) query = query.Where(n => n.Status == q.Status);
        if (q.Category.HasValue) query = query.Where(n => n.Category == q.Category);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<NotificationDto>>.Ok(new PagedResult<NotificationDto>
        {
            Items = items.Select(_mapper.Map<NotificationDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<IReadOnlyList<NotificationPreferenceDto>>> ListPreferencesAsync(Guid userId)
    {
        var rows = await _uow.Repository<UserNotificationPreference>().Query()
            .Where(p => p.UserId == userId)
            .ToListAsync();

        return ApiResponse<IReadOnlyList<NotificationPreferenceDto>>.Ok(
            rows.Select(_mapper.Map<NotificationPreferenceDto>).ToList());
    }

    public async Task<ApiResponse> SetPreferenceAsync(Guid userId, NotificationCategory category, NotificationChannel channel, bool enabled)
    {
        var pref = await _uow.Repository<UserNotificationPreference>()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Category == category && p.Channel == channel);

        if (pref is null)
        {
            await _uow.Repository<UserNotificationPreference>().AddAsync(new UserNotificationPreference
            {
                UserId = userId,
                Category = category,
                Channel = channel,
                Enabled = enabled
            });
        }
        else
        {
            pref.Enabled = enabled;
            _uow.Repository<UserNotificationPreference>().Update(pref);
        }

        await _uow.CompleteAsync();
        return ApiResponse.Ok();
    }

    public async Task<ApiResponse> RegisterDeviceTokenAsync(Guid userId, DeviceTokenRegisterDto dto)
    {
        var existing = await _uow.Repository<DeviceToken>().FirstOrDefaultAsync(d => d.Token == dto.Token);

        if (existing is null)
        {
            await _uow.Repository<DeviceToken>().AddAsync(new DeviceToken
            {
                UserId = userId,
                Token = dto.Token,
                Platform = dto.Platform,
                LastSeenAt = DateTime.UtcNow,
                IsActive = true
            });
        }
        else
        {
            existing.UserId = userId;
            existing.Platform = dto.Platform;
            existing.LastSeenAt = DateTime.UtcNow;
            existing.IsActive = true;
            _uow.Repository<DeviceToken>().Update(existing);
        }

        await _uow.CompleteAsync();
        return ApiResponse.Ok();
    }

    public async Task<ApiResponse> RevokeDeviceTokenAsync(Guid userId, string token)
    {
        var existing = await _uow.Repository<DeviceToken>()
            .FirstOrDefaultAsync(d => d.UserId == userId && d.Token == token);

        if (existing is null) return ApiResponse.Fail(404, "Device token not found.");

        existing.IsActive = false;
        _uow.Repository<DeviceToken>().Update(existing);
        await _uow.CompleteAsync();
        return ApiResponse.Ok();
    }

    private static string Render(string template, IDictionary<string, string> data) =>
        PlaceholderRegex.Replace(template, m =>
        {
            var key = m.Groups[1].Value;
            return data.TryGetValue(key, out var v) ? v : m.Value;
        });
}
