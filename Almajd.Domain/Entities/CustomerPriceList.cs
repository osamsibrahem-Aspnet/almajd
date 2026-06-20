namespace Almajd.Domain.Entities;

/// <summary>
/// Attaches a customer-specific price list to a customer. Higher Priority wins when multiple are attached.
/// </summary>
public class CustomerPriceList : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public Guid PriceListId { get; set; }
    public PriceList PriceList { get; set; } = null!;

    public int Priority { get; set; }
}
