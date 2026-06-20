using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class DiscountCoupon : BaseEntity
{
    public string Code { get; set; } = default!;
    public string? Description { get; set; }

    public DiscountType Type { get; set; } = DiscountType.Percentage;
    /// <summary>Percent (0-100) when Type=Percentage, else a fixed currency amount.</summary>
    public decimal Value { get; set; }

    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }

    public int UsageCap { get; set; }
    public int UsageCount { get; set; }

    public bool IsActive { get; set; } = true;
}
