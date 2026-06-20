namespace Almajd.Domain.Entities;

public class CustomerNote : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public string Body { get; set; } = default!;
    public Guid? AuthorUserId { get; set; }
    public ApplicationUser? AuthorUser { get; set; }
}
