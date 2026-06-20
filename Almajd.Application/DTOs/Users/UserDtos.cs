using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Users;

public class UserListItemDto
{
    public Guid Id { get; set; }
    public string? Email { get; set; }
    public string? UserName { get; set; }
    public string? FullName { get; set; }
    public string? PhoneNumber { get; set; }
    public bool EmailConfirmed { get; set; }
    public bool PhoneNumberConfirmed { get; set; }
    public bool IsLockedOut { get; set; }
    public bool IsDeleted { get; set; }
    public Guid? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();
    public DateTime CreatedAt { get; set; }
}

public class UserDetailDto : UserListItemDto
{
    public DateTime? UpdatedAt { get; set; }
    public int AccessFailedCount { get; set; }
    public DateTimeOffset? LockoutEnd { get; set; }
}

public class CreateStaffUserDto
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = default!;

    [Required, StringLength(128, MinimumLength = 8)]
    public string Password { get; set; } = default!;

    [Required, StringLength(128)]
    public string FullName { get; set; } = default!;

    [Phone, StringLength(32)] public string? PhoneNumber { get; set; }

    [Required, MinLength(1)]
    public List<string> Roles { get; set; } = new();
}

public class SetUserRolesDto
{
    [Required] public List<string> Roles { get; set; } = new();
}

public class UserSearchQuery
{
    public string? Search { get; set; }
    public string? Role { get; set; }
    public bool? IsLockedOut { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
