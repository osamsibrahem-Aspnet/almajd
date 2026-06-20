using Almajd.Domain.Enums;

namespace Almajd.Domain.Entities;

public class NotificationTemplate : BaseEntity
{
    public string Code { get; set; } = default!;              // ORDER_APPROVED, INVOICE_OVERDUE, …
    public NotificationCategory Category { get; set; }
    public string Title { get; set; } = default!;             // supports {{placeholders}}
    public string Body { get; set; } = default!;              // supports {{placeholders}}
    public bool IsActive { get; set; } = true;
}
