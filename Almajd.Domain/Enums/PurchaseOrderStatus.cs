namespace Almajd.Domain.Enums;

public enum PurchaseOrderStatus
{
    Draft = 0,
    Submitted = 1,
    Approved = 2,
    PartiallyReceived = 3,
    FullyReceived = 4,
    Cancelled = 99
}
