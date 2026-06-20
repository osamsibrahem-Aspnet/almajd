using Almajd.Application.DTOs.Notifications;
using Almajd.Domain.Entities;
using AutoMapper;

namespace Almajd.Application.Common.Mappings;

public class NotificationsMappingProfile : Profile
{
    public NotificationsMappingProfile()
    {
        CreateMap<NotificationTemplate, NotificationTemplateDto>();
        CreateMap<Notification, NotificationDto>();
        CreateMap<UserNotificationPreference, NotificationPreferenceDto>();
    }
}
