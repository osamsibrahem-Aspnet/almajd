using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Crm;

public class CustomerListItemDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = default!;
    public string LegalName { get; set; } = default!;
    public string? TradeName { get; set; }
    public CustomerTier Tier { get; set; }
    public CustomerStatus Status { get; set; }
    public int PaymentTermsNetDays { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal CurrentAr { get; set; }
    public string? SalesRepName { get; set; }
}

public class CustomerDto : CustomerListItemDto
{
    public string? TaxId { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? KycDocumentPath { get; set; }
    public Guid? SalesRepId { get; set; }
    public IReadOnlyList<CustomerContactDto> Contacts { get; set; } = Array.Empty<CustomerContactDto>();
    public IReadOnlyList<CustomerAddressDto> Addresses { get; set; } = Array.Empty<CustomerAddressDto>();
    public IReadOnlyList<CustomerNoteDto> Notes { get; set; } = Array.Empty<CustomerNoteDto>();
}

public class CustomerCreateDto
{
    [Required, StringLength(256)]
    public string LegalName { get; set; } = default!;

    [StringLength(256)] public string? TradeName { get; set; }
    [StringLength(64)] public string? TaxId { get; set; }
    [Phone, StringLength(32)] public string? Phone { get; set; }
    [EmailAddress, StringLength(256)] public string? Email { get; set; }

    public CustomerTier Tier { get; set; } = CustomerTier.Small;

    [Range(0, 365)] public int PaymentTermsNetDays { get; set; }

    [Range(0, double.MaxValue)] public decimal CreditLimit { get; set; }

    public Guid? SalesRepId { get; set; }
}

public class CustomerUpdateDto : CustomerCreateDto
{
    public CustomerStatus Status { get; set; }
}

public class CustomerSearchQuery
{
    public string? Search { get; set; }
    public CustomerTier? Tier { get; set; }
    public CustomerStatus? Status { get; set; }
    public Guid? SalesRepId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    /// <summary>One of: name, name-desc, ar-desc, recent.</summary>
    public string? Sort { get; set; }
}

public class CreditCheckResultDto
{
    public Guid CustomerId { get; set; }
    public bool Approved { get; set; }
    public bool RequiresReview { get; set; }
    public string? Reason { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal CurrentAr { get; set; }
    public decimal OrderTotal { get; set; }
    public decimal Projected { get; set; }
    public decimal RemainingHeadroom { get; set; }
}
