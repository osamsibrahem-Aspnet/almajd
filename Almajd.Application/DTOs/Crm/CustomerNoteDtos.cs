using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Crm;

public class CustomerNoteDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string Body { get; set; } = default!;
    public Guid? AuthorUserId { get; set; }
    public string? AuthorName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CustomerNoteCreateDto
{
    [Required, StringLength(4000, MinimumLength = 1)]
    public string Body { get; set; } = default!;
}
