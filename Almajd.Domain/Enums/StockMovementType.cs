namespace Almajd.Domain.Enums;

public enum StockMovementType
{
    /// <summary>Inbound from supplier (Goods Receipt).</summary>
    Receive = 0,
    /// <summary>Outbound to customer (post-shipment).</summary>
    Sell = 1,
    /// <summary>Customer return — back into a warehouse location.</summary>
    Return = 2,
    /// <summary>Move between two locations (same or different warehouse).</summary>
    Transfer = 3,
    /// <summary>Manual positive correction.</summary>
    AdjustIn = 4,
    /// <summary>Manual negative correction.</summary>
    AdjustOut = 5,
    /// <summary>Reserve qty against an order (no on-hand change).</summary>
    Reserve = 6,
    /// <summary>Release a previous reservation.</summary>
    Release = 7
}
