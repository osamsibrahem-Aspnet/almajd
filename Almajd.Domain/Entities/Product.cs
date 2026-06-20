using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class Product : BaseEntity
{
    public Guid BrandId { get; set; }
    public Brand Brand { get; set; } = null!;

    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }

    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string? Description { get; set; }

    public ProductStatus Status { get; set; } = ProductStatus.Draft;
    public bool IsFeatured { get; set; }

    public ICollection<Sku> Skus { get; set; } = new List<Sku>();
    public ICollection<ProductMedia> Media { get; set; } = new List<ProductMedia>();
}
