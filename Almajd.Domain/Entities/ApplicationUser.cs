using Microsoft.AspNetCore.Identity;

namespace Almajd.Domain.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    public string? FullName { get; set; }
    public string? ProfileImagePath { get; set; }

    /// <summary>
    /// When the user is a B2B customer (OTP login), this links to their Customer record.
    /// Null for staff users (Admin, Sales, Warehouse, etc.).
    /// </summary>
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }
}
