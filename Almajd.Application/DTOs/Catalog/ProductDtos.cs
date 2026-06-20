using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Catalog;

public class ProductListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string BrandName { get; set; } = default!;
    public string? CategoryName { get; set; }
    public ProductStatus Status { get; set; }
    public bool IsFeatured { get; set; }
    public string? PrimaryImageUrl { get; set; }
    public int SkuCount { get; set; }
}

public class ProductDto
{
    public Guid Id { get; set; }
    public Guid BrandId { get; set; }
    public string BrandName { get; set; } = default!;
    public Guid? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string? Description { get; set; }
    public ProductStatus Status { get; set; }
    public bool IsFeatured { get; set; }
    public IReadOnlyList<SkuDto> Skus { get; set; } = Array.Empty<SkuDto>();
    public IReadOnlyList<ProductMediaDto> Media { get; set; } = Array.Empty<ProductMediaDto>();
}

public class ProductCreateDto
{
    [Required]
    public Guid BrandId { get; set; }

    public Guid? CategoryId { get; set; }

    [Required, StringLength(256)]
    public string Name { get; set; } = default!;

    public string? Description { get; set; }

    public ProductStatus Status { get; set; } = ProductStatus.Draft;
    public bool IsFeatured { get; set; }
}

public class ProductUpdateDto : ProductCreateDto { }

public class ProductSearchQuery
{
    public string? Search { get; set; }
    public Guid? BrandId { get; set; }
    public Guid? CategoryId { get; set; }
    public ProductStatus? Status { get; set; }
    public bool? IsFeatured { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    /// <summary>One of: name, name-desc, recent.</summary>
    public string? Sort { get; set; }
}
