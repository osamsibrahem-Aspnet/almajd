using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Sales;

public class PriceListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string Currency { get; set; } = default!;
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public CustomerTier? Tier { get; set; }
    public int LineCount { get; set; }
}

public class PriceListDetailDto : PriceListDto
{
    public IReadOnlyList<PriceListLineDto> Lines { get; set; } = Array.Empty<PriceListLineDto>();
}

public class PriceListLineDto
{
    public Guid Id { get; set; }
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string ProductName { get; set; } = default!;
    public decimal UnitPrice { get; set; }
    public int MinQty { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
}

public class PriceListCreateDto
{
    [Required, StringLength(128)]
    public string Name { get; set; } = default!;

    [StringLength(8)]
    public string Currency { get; set; } = "EGP";

    public CustomerTier? Tier { get; set; }
}

public class PriceListUpdateDto : PriceListCreateDto
{
    public bool IsActive { get; set; }
}

public class PriceListLineUpsertDto
{
    [Required] public Guid SkuId { get; set; }
    [Range(0.01, double.MaxValue)] public decimal UnitPrice { get; set; }
    [Range(1, int.MaxValue)] public int MinQty { get; set; } = 1;
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
}

public class CustomerPriceListAssignDto
{
    [Required] public Guid PriceListId { get; set; }
    public int Priority { get; set; } = 100;
}
