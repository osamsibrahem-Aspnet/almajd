using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Inventory;

public class LocationDto
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseCode { get; set; } = default!;
    public string Zone { get; set; } = default!;
    public string Aisle { get; set; } = default!;
    public string Shelf { get; set; } = default!;
    public string Bin { get; set; } = default!;
    public string Address { get; set; } = default!;
    public bool IsPickable { get; set; }
}

public class LocationCreateDto
{
    [Required]
    public Guid WarehouseId { get; set; }

    [Required, StringLength(16)]
    public string Zone { get; set; } = default!;

    [Required, StringLength(16)]
    public string Aisle { get; set; } = default!;

    [Required, StringLength(16)]
    public string Shelf { get; set; } = default!;

    [Required, StringLength(16)]
    public string Bin { get; set; } = default!;

    public bool IsPickable { get; set; } = true;
}

public class LocationUpdateDto : LocationCreateDto { }
