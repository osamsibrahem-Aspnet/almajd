using Almajd.Application.DTOs.Sales;
using Almajd.Domain.Entities;
using AutoMapper;

namespace Almajd.Application.Common.Mappings;

public class SalesMappingProfile : Profile
{
    public SalesMappingProfile()
    {
        CreateMap<PriceList, PriceListDto>()
            .ForMember(d => d.LineCount, o => o.MapFrom(s => s.Lines.Count));

        CreateMap<PriceList, PriceListDetailDto>()
            .ForMember(d => d.LineCount, o => o.MapFrom(s => s.Lines.Count))
            .ForMember(d => d.Lines, o => o.MapFrom(s => s.Lines));

        CreateMap<PriceListLine, PriceListLineDto>()
            .ForMember(d => d.SkuCode, o => o.MapFrom(s => s.Sku.Code))
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Sku.Product.Name));

        CreateMap<DiscountCoupon, CouponDto>();

        CreateMap<Order, OrderListItemDto>()
            .ForMember(d => d.CustomerCode, o => o.MapFrom(s => s.Customer.Code))
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Customer.TradeName ?? s.Customer.LegalName))
            .ForMember(d => d.LineCount, o => o.MapFrom(s => s.Lines.Count))
            .ForMember(d => d.IsLate, o => o.MapFrom(s =>
                s.ExpectedShipAt != null && s.ExpectedShipAt < DateTime.UtcNow && s.Status < Domain.Enums.OrderStatus.Shipped));

        CreateMap<Order, OrderDto>()
            .ForMember(d => d.CustomerCode, o => o.MapFrom(s => s.Customer.Code))
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Customer.TradeName ?? s.Customer.LegalName))
            .ForMember(d => d.LineCount, o => o.MapFrom(s => s.Lines.Count))
            .ForMember(d => d.SalesRepName, o => o.MapFrom(s => s.SalesRep != null ? s.SalesRep.FullName ?? s.SalesRep.Email : null))
            .ForMember(d => d.CouponCode, o => o.MapFrom(s => s.Coupon != null ? s.Coupon.Code : null))
            .ForMember(d => d.IsLate, o => o.MapFrom(s =>
                s.ExpectedShipAt != null && s.ExpectedShipAt < DateTime.UtcNow && s.Status < Domain.Enums.OrderStatus.Shipped));

        CreateMap<OrderLine, OrderLineDto>()
            .ForMember(d => d.SkuCode, o => o.MapFrom(s => s.Sku.Code))
            .ForMember(d => d.Barcode, o => o.MapFrom(s => s.Sku.Barcode))
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Sku.Product.Name))
            .ForMember(d => d.ReservedFromLocationAddress,
                o => o.MapFrom(s => s.ReservedFromLocation != null
                    ? $"{s.ReservedFromLocation.Zone}-{s.ReservedFromLocation.Aisle}-{s.ReservedFromLocation.Shelf}-{s.ReservedFromLocation.Bin}"
                    : null));
    }
}
