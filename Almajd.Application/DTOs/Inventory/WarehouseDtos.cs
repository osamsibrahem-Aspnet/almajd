using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Inventory;

public class WarehouseDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Address { get; set; }
    public bool IsActive { get; set; }
    public int LocationCount { get; set; }
}

public class WarehouseCreateDto
{
    [Required, StringLength(32)]
    public string Code { get; set; } = default!;

    [Required, StringLength(128)]
    public string Name { get; set; } = default!;

    [StringLength(512)]
    public string? Address { get; set; }
}

public class WarehouseUpdateDto : WarehouseCreateDto
{
    public bool IsActive { get; set; }
}
