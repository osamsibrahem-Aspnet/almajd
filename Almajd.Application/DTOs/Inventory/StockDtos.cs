using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Inventory;

public class StockItemDto
{
    public Guid Id { get; set; }
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string Barcode { get; set; } = default!;
    public string ProductName { get; set; } = default!;
    public Guid LocationId { get; set; }
    public string LocationAddress { get; set; } = default!;
    public Guid WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = default!;
    public int QtyOnHand { get; set; }
    public int QtyReserved { get; set; }
    public int QtyAvailable { get; set; }
}

public class StockMovementDto
{
    public Guid Id { get; set; }
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string ProductName { get; set; } = default!;
    public string? FromLocationAddress { get; set; }
    public string? ToLocationAddress { get; set; }
    public int Quantity { get; set; }
    public StockMovementType Type { get; set; }
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
    public Guid? UserId { get; set; }
    public string? Notes { get; set; }
    public DateTime OccurredAt { get; set; }
}

public class StockSearchQuery
{
    public Guid? SkuId { get; set; }
    public string? SkuCode { get; set; }
    public string? Barcode { get; set; }
    public Guid? WarehouseId { get; set; }
    public Guid? LocationId { get; set; }
    public bool OnlyAvailable { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class MovementSearchQuery
{
    public Guid? SkuId { get; set; }
    public Guid? LocationId { get; set; }
    public StockMovementType? Type { get; set; }
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
