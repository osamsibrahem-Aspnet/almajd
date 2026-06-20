using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class PriceList : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Currency { get; set; } = "EGP";
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>If set, this list only applies to customers of that tier (e.g. VIP pricing).</summary>
    public CustomerTier? Tier { get; set; }

    public ICollection<PriceListLine> Lines { get; set; } = new List<PriceListLine>();
}
