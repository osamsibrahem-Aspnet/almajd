using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Sales;

public class CouponDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = default!;
    public string? Description { get; set; }
    public DiscountType Type { get; set; }
    public decimal Value { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public int UsageCap { get; set; }
    public int UsageCount { get; set; }
    public bool IsActive { get; set; }
}

public class CouponCreateDto
{
    [Required, StringLength(64)]
    public string Code { get; set; } = default!;

    [StringLength(512)] public string? Description { get; set; }

    public DiscountType Type { get; set; } = DiscountType.Percentage;

    [Range(0, double.MaxValue)] public decimal Value { get; set; }

    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    [Range(0, int.MaxValue)] public int UsageCap { get; set; }
}

public class CouponUpdateDto : CouponCreateDto
{
    public bool IsActive { get; set; }
}
