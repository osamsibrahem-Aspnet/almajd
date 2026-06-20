using Almajd.Application.DTOs.Crm;
using Almajd.Domain.Entities;
using AutoMapper;

namespace Almajd.Application.Common.Mappings;

public class CrmMappingProfile : Profile
{
    public CrmMappingProfile()
    {
        CreateMap<Customer, CustomerListItemDto>()
            .ForMember(d => d.SalesRepName,
                o => o.MapFrom(s => s.SalesRep != null ? s.SalesRep.FullName ?? s.SalesRep.Email : null));

        CreateMap<Customer, CustomerDto>()
            .ForMember(d => d.SalesRepName,
                o => o.MapFrom(s => s.SalesRep != null ? s.SalesRep.FullName ?? s.SalesRep.Email : null));

        CreateMap<CustomerContact, CustomerContactDto>();
        CreateMap<CustomerAddress, CustomerAddressDto>();
        CreateMap<CustomerNote, CustomerNoteDto>()
            .ForMember(d => d.AuthorName,
                o => o.MapFrom(s => s.AuthorUser != null ? s.AuthorUser.FullName ?? s.AuthorUser.Email : null));
    }
}
