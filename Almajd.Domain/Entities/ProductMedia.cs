using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class ProductMedia : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public string Url { get; set; } = default!;
    public MediaKind Kind { get; set; } = MediaKind.Image;
    public int SortOrder { get; set; }
}
