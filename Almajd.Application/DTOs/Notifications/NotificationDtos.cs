using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Notifications;

public class NotificationTemplateDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = default!;
    public NotificationCategory Category { get; set; }
    public string Title { get; set; } = default!;
    public string Body { get; set; } = default!;
    public bool IsActive { get; set; }
}

public class NotificationTemplateUpsertDto
{
    [Required, StringLength(64)] public string Code { get; set; } = default!;
    public NotificationCategory Category { get; set; }
    [Required, StringLength(256)] public string Title { get; set; } = default!;
    [Required, StringLength(4000)] public string Body { get; set; } = default!;
    public bool IsActive { get; set; } = true;
}

public class NotificationDto
{
    public Guid Id { get; set; }
    public string TemplateCode { get; set; } = default!;
    public NotificationCategory Category { get; set; }
    public NotificationChannel Channel { get; set; }
    public NotificationStatus Status { get; set; }
    public string Title { get; set; } = default!;
    public string Body { get; set; } = default!;
    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
    public string? Error { get; set; }
}

public class NotificationSearchQuery
{
    public NotificationStatus? Status { get; set; }
    public NotificationCategory? Category { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class NotificationPreferenceDto
{
    public NotificationCategory Category { get; set; }
    public NotificationChannel Channel { get; set; }
    public bool Enabled { get; set; }
}

public class DeviceTokenRegisterDto
{
    [Required, StringLength(512)] public string Token { get; set; } = default!;
    [Required, StringLength(16)] public string Platform { get; set; } = default!;
}
