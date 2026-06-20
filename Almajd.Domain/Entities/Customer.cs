using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class Customer : BaseEntity
{
    public string Code { get; set; } = default!;        // CUST-00001
    public string LegalName { get; set; } = default!;
    public string? TradeName { get; set; }
    public string? TaxId { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }

    public CustomerTier Tier { get; set; } = CustomerTier.Small;
    public CustomerStatus Status { get; set; } = CustomerStatus.Active;

    /// <summary>Days until invoice is due (0 = on receipt, 30 = Net 30, etc.).</summary>
    public int PaymentTermsNetDays { get; set; }

    public decimal CreditLimit { get; set; }
    /// <summary>Maintained by the Billing module (M8). Read by ICustomerCreditService.</summary>
    public decimal CurrentAr { get; set; }

    public Guid? SalesRepId { get; set; }
    public ApplicationUser? SalesRep { get; set; }

    public string? KycDocumentPath { get; set; }

    public ICollection<CustomerContact> Contacts { get; set; } = new List<CustomerContact>();
    public ICollection<CustomerAddress> Addresses { get; set; } = new List<CustomerAddress>();
    public ICollection<CustomerNote> Notes { get; set; } = new List<CustomerNote>();
}
