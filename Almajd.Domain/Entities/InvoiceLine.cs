namespace Almajd.Domain.Entities;

public class InvoiceLine : BaseEntity
{
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public Guid SkuId { get; set; }
    public Sku Sku { get; set; } = null!;

    public string Description { get; set; } = default!;     // snapshot of product name at issue
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
