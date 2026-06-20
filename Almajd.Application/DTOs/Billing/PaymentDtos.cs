using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Billing;

public class PaymentAllocationInputDto
{
    [Required] public Guid InvoiceId { get; set; }
    [Range(0.01, double.MaxValue)] public decimal Amount { get; set; }
}

public class PaymentCreateDto
{
    [Required] public Guid CustomerId { get; set; }
    public PaymentMethod Method { get; set; } = PaymentMethod.BankTransfer;
    [Range(0.01, double.MaxValue)] public decimal Amount { get; set; }
    [StringLength(8)] public string Currency { get; set; } = "EGP";
    public DateTime? PaidAt { get; set; }
    [StringLength(128)] public string? Reference { get; set; }
    [StringLength(2000)] public string? Notes { get; set; }
    public List<PaymentAllocationInputDto> Allocations { get; set; } = new();
}

public class PaymentAllocationDto
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = default!;
    public decimal Amount { get; set; }
}

public class PaymentDto
{
    public Guid Id { get; set; }
    public string Number { get; set; } = default!;
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = default!;
    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = default!;
    public DateTime PaidAt { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public Guid? RecordedByUserId { get; set; }
    public string? RecordedByName { get; set; }
    public decimal AllocatedAmount { get; set; }
    public decimal Unallocated { get; set; }
    public IReadOnlyList<PaymentAllocationDto> Allocations { get; set; } = Array.Empty<PaymentAllocationDto>();
}

public class PaymentSearchQuery
{
    public Guid? CustomerId { get; set; }
    public PaymentMethod? Method { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
