using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Fulfilment;

public class ShipmentDto
{
    public Guid Id { get; set; }
    public string Number { get; set; } = default!;
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = default!;
    public string CustomerName { get; set; } = default!;
    public ShipmentStatus Status { get; set; }
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

public class ShipmentCreateDto
{
    [Required] public Guid OrderId { get; set; }
    [StringLength(128)] public string? Carrier { get; set; }
    [StringLength(128)] public string? Waybill { get; set; }
    [StringLength(128)] public string? DriverName { get; set; }
    [Phone, StringLength(32)] public string? DriverPhone { get; set; }
    [StringLength(2000)] public string? Notes { get; set; }
}

public class AssignDriverDto
{
    [Required, StringLength(128)] public string DriverName { get; set; } = default!;
    [Phone, StringLength(32)] public string? DriverPhone { get; set; }
    [StringLength(128)] public string? Carrier { get; set; }
    [StringLength(128)] public string? Waybill { get; set; }
}

public class DeliverDto
{
    [Required, StringLength(128)]
    public string PodSignerName { get; set; } = default!;

    [StringLength(1024)] public string? PodUrl { get; set; }
}

public class CancelShipmentDto
{
    [StringLength(512)] public string? Reason { get; set; }
}

public class ShipmentSearchQuery
{
    public ShipmentStatus? Status { get; set; }
    public Guid? OrderId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
