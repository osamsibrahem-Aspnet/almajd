using Almajd.Application.DTOs.Purchasing;
using Almajd.Domain.Entities;
using AutoMapper;

namespace Almajd.Application.Common.Mappings;

public class PurchasingMappingProfile : Profile
{
    public PurchasingMappingProfile()
    {
        CreateMap<Supplier, SupplierDto>()
            .ForMember(d => d.SuppliedSkuCount, o => o.MapFrom(s => s.SuppliedSkus.Count));

        CreateMap<SupplierSku, SupplierSkuDto>()
            .ForMember(d => d.SupplierName, o => o.MapFrom(s => s.Supplier.Name))
            .ForMember(d => d.SkuCode, o => o.MapFrom(s => s.Sku.Code))
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Sku.Product.Name));

        CreateMap<PurchaseOrder, PurchaseOrderListItemDto>()
            .ForMember(d => d.SupplierName, o => o.MapFrom(s => s.Supplier.Name))
            .ForMember(d => d.LineCount, o => o.MapFrom(s => s.Lines.Count));

        CreateMap<PurchaseOrder, PurchaseOrderDto>()
            .ForMember(d => d.SupplierName, o => o.MapFrom(s => s.Supplier.Name))
            .ForMember(d => d.LineCount, o => o.MapFrom(s => s.Lines.Count))
            .ForMember(d => d.ApprovedByName,
                o => o.MapFrom(s => s.ApprovedBy != null ? s.ApprovedBy.FullName ?? s.ApprovedBy.Email : null));

        CreateMap<PurchaseOrderLine, PurchaseOrderLineDto>()
            .ForMember(d => d.SkuCode, o => o.MapFrom(s => s.Sku.Code))
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Sku.Product.Name))
            .ForMember(d => d.OutstandingQty, o => o.MapFrom(s => s.Qty - s.ReceivedQty))
            .ForMember(d => d.LineTotal, o => o.MapFrom(s => s.Qty * s.CostPrice));

        CreateMap<GoodsReceipt, GoodsReceiptDto>()
            .ForMember(d => d.PurchaseOrderNumber, o => o.MapFrom(s => s.PurchaseOrder.Number))
            .ForMember(d => d.SupplierName, o => o.MapFrom(s => s.PurchaseOrder.Supplier.Name))
            .ForMember(d => d.LineCount, o => o.MapFrom(s => s.Lines.Count))
            .ForMember(d => d.ReceivedByName,
                o => o.MapFrom(s => s.ReceivedBy != null ? s.ReceivedBy.FullName ?? s.ReceivedBy.Email : null));

        CreateMap<GoodsReceiptLine, GoodsReceiptLineDto>()
            .ForMember(d => d.SkuCode, o => o.MapFrom(s => s.Sku.Code))
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Sku.Product.Name))
            .ForMember(d => d.LocationAddress,
                o => o.MapFrom(s => $"{s.Location.Zone}-{s.Location.Aisle}-{s.Location.Shelf}-{s.Location.Bin}"));
    }
}
