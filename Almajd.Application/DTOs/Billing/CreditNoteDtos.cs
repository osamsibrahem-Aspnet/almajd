using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Billing;

public class CreditNoteDto
{
    public Guid Id { get; set; }
    public string Number { get; set; } = default!;
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = default!;
    public DateTime IssuedAt { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = default!;
    public string Reason { get; set; } = default!;
    public string? IssuedByName { get; set; }
}

public class CreditNoteCreateDto
{
    [Required] public Guid InvoiceId { get; set; }
    [Range(0.01, double.MaxValue)] public decimal Amount { get; set; }
    [Required, StringLength(1024)] public string Reason { get; set; } = default!;
}
