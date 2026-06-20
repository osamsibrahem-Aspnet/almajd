namespace Almajd.Domain.Entities;

public class CustomerContact : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public string Name { get; set; } = default!;
    public string? Role { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }

    public bool IsPrimary { get; set; }
}
