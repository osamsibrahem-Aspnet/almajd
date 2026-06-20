using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Crm;

public class CustomerAddressDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public AddressKind Kind { get; set; }
    public string Line1 { get; set; } = default!;
    public string? Line2 { get; set; }
    public string City { get; set; } = default!;
    public string? Region { get; set; }
    public string? Country { get; set; }
    public double? GeoLat { get; set; }
    public double? GeoLng { get; set; }
    public bool IsDefault { get; set; }
}

public class CustomerAddressCreateDto
{
    public AddressKind Kind { get; set; } = AddressKind.ShipTo;

    [Required, StringLength(256)]
    public string Line1 { get; set; } = default!;

    [StringLength(256)] public string? Line2 { get; set; }

    [Required, StringLength(128)]
    public string City { get; set; } = default!;

    [StringLength(128)] public string? Region { get; set; }
    [StringLength(64)] public string? Country { get; set; }

    public double? GeoLat { get; set; }
    public double? GeoLng { get; set; }
    public bool IsDefault { get; set; }
}

public class CustomerAddressUpdateDto : CustomerAddressCreateDto { }
