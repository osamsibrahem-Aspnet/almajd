namespace Almajd.Domain.Entities;

public class Supplier : BaseEntity
{
    public string Code { get; set; } = default!;      // SUP-00001
    public string Name { get; set; } = default!;
    public string? TaxId { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }

    /// <summary>How many days we have to pay after receipt (Net 30, etc.).</summary>
    public int PaymentTermsNetDays { get; set; }

    public string Currency { get; set; } = "EGP";

    public bool IsActive { get; set; } = true;

    public ICollection<SupplierSku> SuppliedSkus { get; set; } = new List<SupplierSku>();
}
