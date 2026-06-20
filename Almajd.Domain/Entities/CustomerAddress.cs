using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class CustomerAddress : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public AddressKind Kind { get; set; } = AddressKind.ShipTo;

    public string Line1 { get; set; } = default!;
    public string? Line2 { get; set; }
    public string City { get; set; } = default!;
    public string? Region { get; set; }
    public string? Country { get; set; }

    public double? GeoLat { get; set; }
    public double? GeoLng { get; set; }

    public bool IsDefault { get; set; }
}
