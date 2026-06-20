using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Catalog;

public class CategoryDto
{
    public Guid Id { get; set; }
    public Guid? ParentId { get; set; }
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public string? AttributeSchemaJson { get; set; }
}

public class CategoryTreeNodeDto : CategoryDto
{
    public IReadOnlyList<CategoryTreeNodeDto> Children { get; set; } = Array.Empty<CategoryTreeNodeDto>();
}

public class CategoryCreateDto
{
    [Required, StringLength(128)]
    public string Name { get; set; } = default!;

    public Guid? ParentId { get; set; }

    [StringLength(1024)]
    public string? Description { get; set; }

    public int SortOrder { get; set; }
    public string? AttributeSchemaJson { get; set; }
}

public class CategoryUpdateDto : CategoryCreateDto
{
    public bool IsActive { get; set; }
}
