using Almajd.Application.DTOs.Inventory;
using Almajd.Domain.Entities;
using AutoMapper;

namespace Almajd.Application.Common.Mappings;

public class InventoryMappingProfile : Profile
{
    public InventoryMappingProfile()
    {
        CreateMap<Warehouse, WarehouseDto>()
            .ForMember(d => d.LocationCount, o => o.MapFrom(s => s.Locations.Count));

        CreateMap<Location, LocationDto>()
            .ForMember(d => d.WarehouseCode, o => o.MapFrom(s => s.Warehouse.Code))
            .ForMember(d => d.Address, o => o.MapFrom(s => s.Address));

        CreateMap<StockItem, StockItemDto>()
            .ForMember(d => d.SkuCode, o => o.MapFrom(s => s.Sku.Code))
            .ForMember(d => d.Barcode, o => o.MapFrom(s => s.Sku.Barcode))
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Sku.Product.Name))
            .ForMember(d => d.LocationAddress, o => o.MapFrom(s => s.Location.Address))
            .ForMember(d => d.WarehouseId, o => o.MapFrom(s => s.Location.WarehouseId))
            .ForMember(d => d.WarehouseCode, o => o.MapFrom(s => s.Location.Warehouse.Code))
            .ForMember(d => d.QtyAvailable, o => o.MapFrom(s => s.QtyOnHand - s.QtyReserved));

        CreateMap<StockMovement, StockMovementDto>()
            .ForMember(d => d.SkuCode, o => o.MapFrom(s => s.Sku.Code))
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Sku.Product.Name))
            .ForMember(d => d.FromLocationAddress,
                o => o.MapFrom(s => s.FromLocation != null ? s.FromLocation.Address : null))
            .ForMember(d => d.ToLocationAddress,
                o => o.MapFrom(s => s.ToLocation != null ? s.ToLocation.Address : null));

        CreateMap<InventoryCount, InventoryCountDto>()
            .ForMember(d => d.WarehouseCode, o => o.MapFrom(s => s.Warehouse.Code))
            .ForMember(d => d.LineCount, o => o.MapFrom(s => s.Lines.Count))
            .ForMember(d => d.TotalVariance, o => o.MapFrom(s => s.Lines.Sum(l => l.CountedQty - l.SystemQty)));

        CreateMap<InventoryCount, InventoryCountDetailDto>()
            .ForMember(d => d.WarehouseCode, o => o.MapFrom(s => s.Warehouse.Code))
            .ForMember(d => d.LineCount, o => o.MapFrom(s => s.Lines.Count))
            .ForMember(d => d.TotalVariance, o => o.MapFrom(s => s.Lines.Sum(l => l.CountedQty - l.SystemQty)))
            .ForMember(d => d.Lines, o => o.MapFrom(s => s.Lines));

        CreateMap<InventoryCountLine, InventoryCountLineDto>()
            .ForMember(d => d.SkuCode, o => o.MapFrom(s => s.Sku.Code))
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Sku.Product.Name))
            .ForMember(d => d.LocationAddress, o => o.MapFrom(s => s.Location.Address))
            .ForMember(d => d.Variance, o => o.MapFrom(s => s.CountedQty - s.SystemQty));
    }
}
