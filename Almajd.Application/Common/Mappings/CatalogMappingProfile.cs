using Almajd.Application.DTOs.Catalog;
using Almajd.Domain.Entities;
using AutoMapper;

namespace Almajd.Application.Common.Mappings;

public class CatalogMappingProfile : Profile
{
    public CatalogMappingProfile()
    {
        CreateMap<Brand, BrandDto>();

        CreateMap<Category, CategoryDto>();
        CreateMap<Category, CategoryTreeNodeDto>()
            .ForMember(d => d.Children, o => o.Ignore()); // built recursively in service

        CreateMap<Sku, SkuDto>();
        CreateMap<ProductMedia, ProductMediaDto>();

        CreateMap<Product, ProductDto>()
            .ForMember(d => d.BrandName, o => o.MapFrom(s => s.Brand.Name))
            .ForMember(d => d.CategoryName, o => o.MapFrom(s => s.Category != null ? s.Category.Name : null));

        CreateMap<Product, ProductListItemDto>()
            .ForMember(d => d.BrandName, o => o.MapFrom(s => s.Brand.Name))
            .ForMember(d => d.CategoryName, o => o.MapFrom(s => s.Category != null ? s.Category.Name : null))
            .ForMember(d => d.SkuCount, o => o.MapFrom(s => s.Skus.Count))
            .ForMember(d => d.PrimaryImageUrl,
                o => o.MapFrom(s => s.Media.OrderBy(m => m.SortOrder).Select(m => m.Url).FirstOrDefault()));
    }
}
