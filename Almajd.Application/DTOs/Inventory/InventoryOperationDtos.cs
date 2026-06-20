using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Inventory;

public class ReceiveStockDto
{
    [Required] public Guid SkuId { get; set; }
    [Required] public Guid ToLocationId { get; set; }
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
    [StringLength(512)] public string? Notes { get; set; }
}

public class AdjustStockDto
{
    [Required] public Guid SkuId { get; set; }
    [Required] public Guid LocationId { get; set; }
    /// <summary>Positive = increase on-hand. Negative = decrease.</summary>
    public int Delta { get; set; }
    [Required, StringLength(512)] public string Reason { get; set; } = default!;
}

public class TransferStockDto
{
    [Required] public Guid SkuId { get; set; }
    [Required] public Guid FromLocationId { get; set; }
    [Required] public Guid ToLocationId { get; set; }
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
    [StringLength(512)] public string? Notes { get; set; }
}

public class ReserveStockDto
{
    [Required] public Guid SkuId { get; set; }
    [Required] public Guid LocationId { get; set; }
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
}

public class ConfirmSaleDto
{
    [Required] public Guid SkuId { get; set; }
    [Required] public Guid LocationId { get; set; }
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
    public string? ReferenceType { get; set; }
    public Guid? ReferenceId { get; set; }
}
