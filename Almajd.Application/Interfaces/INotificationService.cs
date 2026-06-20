using Almajd.Application.Common;
using Almajd.Application.DTOs.Notifications;
using Almajd.Domain.Enums;

namespace Almajd.Application.Interfaces;

public interface INotificationService
{
    /// <summary>
    /// Dispatch a notification to a user by template code. Renders the template with the
    /// supplied data, checks per-user preferences, fans out to enabled channels, and writes
    /// one Notification row per channel-attempt.
    /// </summary>
    Task<ApiResponse> DispatchAsync(Guid userId, string templateCode, IDictionary<string, string> data);

    /// <summary>
    /// Broadcast to many users at once (e.g. low-stock alert to all admins).
    /// </summary>
    Task<ApiResponse> BroadcastAsync(IEnumerable<Guid> userIds, string templateCode, IDictionary<string, string> data);

    /// <summary>
    /// Dispatch to every ApplicationUser linked to the given Customer. Silently no-ops if
    /// the customer has no linked users (e.g. created by an admin before any OTP login).
    /// </summary>
    Task<ApiResponse> DispatchToCustomerAsync(Guid customerId, string templateCode, IDictionary<string, string> data);

    Task<ApiResponse<IReadOnlyList<NotificationTemplateDto>>> ListTemplatesAsync();
    Task<ApiResponse<NotificationTemplateDto>> UpsertTemplateAsync(NotificationTemplateUpsertDto dto);

    // User inbox + preferences
    Task<ApiResponse<PagedResult<NotificationDto>>> InboxAsync(Guid userId, NotificationSearchQuery query);
    Task<ApiResponse<IReadOnlyList<NotificationPreferenceDto>>> ListPreferencesAsync(Guid userId);
    Task<ApiResponse> SetPreferenceAsync(Guid userId, NotificationCategory category, NotificationChannel channel, bool enabled);

    // Device tokens
    Task<ApiResponse> RegisterDeviceTokenAsync(Guid userId, DeviceTokenRegisterDto dto);
    Task<ApiResponse> RevokeDeviceTokenAsync(Guid userId, string token);
}
