namespace Almajd.Domain.Enums;

public enum OrderStatus
{
    Draft = 0,
    Submitted = 1,
    UnderReview = 2,
    Approved = 3,
    InPreparation = 4,
    ReadyToShip = 5,
    Shipped = 6,
    Delivered = 7,
    Closed = 8,
    Cancelled = 99
}
