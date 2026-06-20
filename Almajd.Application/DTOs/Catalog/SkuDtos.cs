using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Catalog;

public class SkuDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string Code { get; set; } = default!;
    public string Barcode { get; set; } = default!;
    public string? AttributesJson { get; set; }
    public int WeightG { get; set; }
    public bool IsActive { get; set; }
}

public class SkuCreateDto
{
    [Required]
    public Guid ProductId { get; set; }

    [Required, StringLength(64)]
    public string Code { get; set; } = default!;

    [Required, StringLength(64)]
    public string Barcode { get; set; } = default!;

    public string? AttributesJson { get; set; }
    public int WeightG { get; set; }
}

public class SkuUpdateDto
{
    [Required, StringLength(64)]
    public string Code { get; set; } = default!;

    [Required, StringLength(64)]
    public string Barcode { get; set; } = default!;

    public string? AttributesJson { get; set; }
    public int WeightG { get; set; }
    public bool IsActive { get; set; }
}
