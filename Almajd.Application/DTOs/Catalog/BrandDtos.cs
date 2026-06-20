using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Catalog;

public class BrandDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string? LogoPath { get; set; }
    public bool IsActive { get; set; }
}

public class BrandCreateDto
{
    [Required, StringLength(128)]
    public string Name { get; set; } = default!;

    [StringLength(512)]
    public string? LogoPath { get; set; }
}

public class BrandUpdateDto
{
    [Required, StringLength(128)]
    public string Name { get; set; } = default!;

    [StringLength(512)]
    public string? LogoPath { get; set; }

    public bool IsActive { get; set; }
}
