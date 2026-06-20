using Almajd.Application.DTOs.Fulfilment;
using Almajd.Domain.Entities;
using AutoMapper;

namespace Almajd.Application.Common.Mappings;

public class FulfilmentMappingProfile : Profile
{
    public FulfilmentMappingProfile()
    {
        CreateMap<PickListLine, PickListLineDto>()
            .ForMember(d => d.SkuCode, o => o.MapFrom(s => s.Sku.Code))
            .ForMember(d => d.Barcode, o => o.MapFrom(s => s.Sku.Barcode))
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Sku.Product.Name))
            .ForMember(d => d.LocationAddress,
                o => o.MapFrom(s => $"{s.Location.Zone}-{s.Location.Aisle}-{s.Location.Shelf}-{s.Location.Bin}"))
            .ForMember(d => d.IsComplete,
                o => o.MapFrom(s => s.PickedQty >= s.RequestedQty || s.IsShort));

        CreateMap<PickList, PickListDto>()
            .ForMember(d => d.OrderNumber, o => o.MapFrom(s => s.Order.Number))
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Order.Customer.TradeName ?? s.Order.Customer.LegalName))
            .ForMember(d => d.PickedByName,
                o => o.MapFrom(s => s.PickedBy != null ? s.PickedBy.FullName ?? s.PickedBy.Email : null))
            .ForMember(d => d.TotalLines, o => o.MapFrom(s => s.Lines.Count))
            .ForMember(d => d.CompletedLines,
                o => o.MapFrom(s => s.Lines.Count(l => l.PickedQty >= l.RequestedQty || l.IsShort)));

        CreateMap<PickList, PickListDetailDto>()
            .ForMember(d => d.OrderNumber, o => o.MapFrom(s => s.Order.Number))
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Order.Customer.TradeName ?? s.Order.Customer.LegalName))
            .ForMember(d => d.PickedByName,
                o => o.MapFrom(s => s.PickedBy != null ? s.PickedBy.FullName ?? s.PickedBy.Email : null))
            .ForMember(d => d.TotalLines, o => o.MapFrom(s => s.Lines.Count))
            .ForMember(d => d.CompletedLines,
                o => o.MapFrom(s => s.Lines.Count(l => l.PickedQty >= l.RequestedQty || l.IsShort)))
            .ForMember(d => d.Lines, o => o.MapFrom(s => s.Lines));

        CreateMap<Shipment, ShipmentDto>()
            .ForMember(d => d.OrderNumber, o => o.MapFrom(s => s.Order.Number))
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Order.Customer.TradeName ?? s.Order.Customer.LegalName));
    }
}
