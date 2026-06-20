using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Crm;

public class CustomerContactDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string Name { get; set; } = default!;
    public string? Role { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsPrimary { get; set; }
}

public class CustomerContactCreateDto
{
    [Required, StringLength(128)]
    public string Name { get; set; } = default!;

    [StringLength(64)] public string? Role { get; set; }
    [Phone, StringLength(32)] public string? Phone { get; set; }
    [EmailAddress, StringLength(256)] public string? Email { get; set; }
    public bool IsPrimary { get; set; }
}

public class CustomerContactUpdateDto : CustomerContactCreateDto { }
