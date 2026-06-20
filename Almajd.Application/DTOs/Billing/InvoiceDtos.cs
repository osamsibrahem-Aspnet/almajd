using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Billing;

public class InvoiceLineDto
{
    public Guid Id { get; set; }
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string Description { get; set; } = default!;
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPct { get; set; }
    public decimal TaxPct { get; set; }
    public decimal LineSubTotal { get; set; }
    public decimal LineDiscountAmount { get; set; }
    public decimal LineNet { get; set; }
    public decimal LineTaxAmount { get; set; }
    public decimal LineTotal { get; set; }
}

public class InvoiceListItemDto
{
    public Guid Id { get; set; }
    public string Number { get; set; } = default!;
    public Guid CustomerId { get; set; }
    public string CustomerCode { get; set; } = default!;
    public string CustomerName { get; set; } = default!;
    public InvoiceStatus Status { get; set; }
    public string Currency { get; set; } = default!;
    public DateTime IssuedAt { get; set; }
    public DateTime DueAt { get; set; }
    public decimal Total { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal Outstanding { get; set; }
    public int DaysOverdue { get; set; }
}

public class InvoiceDto : InvoiceListItemDto
{
    public Guid? OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public Guid? ShipmentId { get; set; }
    public string? ShipmentNumber { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidReason { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal TaxTotal { get; set; }
    public string? ShipToAddressSnapshot { get; set; }
    public string? Notes { get; set; }
    public IReadOnlyList<InvoiceLineDto> Lines { get; set; } = Array.Empty<InvoiceLineDto>();
}

public class IssueInvoiceFromOrderDto
{
    [Required] public Guid OrderId { get; set; }
    public int? OverridePaymentTermsNetDays { get; set; }
    [StringLength(2000)] public string? Notes { get; set; }
}

public class VoidInvoiceDto
{
    [Required, StringLength(512)]
    public string Reason { get; set; } = default!;
}

public class InvoiceSearchQuery
{
    public string? Search { get; set; }
    public Guid? CustomerId { get; set; }
    public InvoiceStatus? Status { get; set; }
    public bool? Overdue { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
