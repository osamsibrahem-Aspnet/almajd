using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class Shipment : BaseEntity
{
    public string Number { get; set; } = default!;  // SHP-2026-000001

    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public ShipmentStatus Status { get; set; } = ShipmentStatus.Created;

    public string? Carrier { get; set; }
    public string? Waybill { get; set; }
    public string? DriverName { get; set; }
    public string? DriverPhone { get; set; }

    public DateTime? DispatchedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }

    public string? PodUrl { get; set; }
    public string? PodSignerName { get; set; }

    public string? Notes { get; set; }
}
