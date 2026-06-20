using Almajd.Application.DTOs.Auth;
using Almajd.Domain.Entities;
using AutoMapper;

namespace Almajd.Application.Common.Mappings;

public class AuthMappingProfile : Profile
{
    public AuthMappingProfile()
    {
        CreateMap<ApplicationUser, AuthResponseDto>()
            .ForMember(d => d.UserId, o => o.MapFrom(s => s.Id))
            .ForMember(d => d.Roles, o => o.Ignore())
            .ForMember(d => d.Token, o => o.Ignore())
            .ForMember(d => d.ExpiresAt, o => o.Ignore());
    }
}
