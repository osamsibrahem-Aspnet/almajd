using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Inventory;

public class InventoryCountDto
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = default!;
    public InventoryCountStatus Status { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? PostedAt { get; set; }
    public string? Notes { get; set; }
    public int LineCount { get; set; }
    public int TotalVariance { get; set; }
}

public class InventoryCountLineDto
{
    public Guid Id { get; set; }
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string ProductName { get; set; } = default!;
    public Guid LocationId { get; set; }
    public string LocationAddress { get; set; } = default!;
    public int SystemQty { get; set; }
    public int CountedQty { get; set; }
    public int Variance { get; set; }
}

public class InventoryCountDetailDto : InventoryCountDto
{
    public IReadOnlyList<InventoryCountLineDto> Lines { get; set; } = Array.Empty<InventoryCountLineDto>();
}

public class CreateInventoryCountDto
{
    [Required] public Guid WarehouseId { get; set; }
    [StringLength(1024)] public string? Notes { get; set; }
}

public class CountLineInputDto
{
    [Required] public Guid SkuId { get; set; }
    [Required] public Guid LocationId { get; set; }
    [Range(0, int.MaxValue)] public int CountedQty { get; set; }
}
