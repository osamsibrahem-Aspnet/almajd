using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class Invoice : BaseEntity
{
    public string Number { get; set; } = default!;        // INV-2026-000001 (gapless)

    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public Guid? OrderId { get; set; }
    public Order? Order { get; set; }

    public Guid? ShipmentId { get; set; }
    public Shipment? Shipment { get; set; }

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Issued;
    public string Currency { get; set; } = "EGP";

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    public DateTime DueAt { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidReason { get; set; }

    public decimal SubTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal TaxTotal { get; set; }
    public decimal Total { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal Outstanding => Total - AmountPaid;

    public string? ShipToAddressSnapshot { get; set; }
    public string? Notes { get; set; }

    public ICollection<InvoiceLine> Lines { get; set; } = new List<InvoiceLine>();
}
