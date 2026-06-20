using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Catalog;

public class ProductMediaDto
{
    public Guid Id { get; set; }
    public string Url { get; set; } = default!;
    public MediaKind Kind { get; set; }
    public int SortOrder { get; set; }
}
