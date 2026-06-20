namespace Almajd.Application.DTOs.Reports;

public class SalesReportQuery
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? BrandId { get; set; }
    /// <summary>One of: day, week, month, year.</summary>
    public string GroupBy { get; set; } = "month";
}

public class SalesReportPointDto
{
    public string Bucket { get; set; } = default!;        // e.g. "2026-06"
    public int OrderCount { get; set; }
    public int UnitsSold { get; set; }
    public decimal Revenue { get; set; }
    public decimal Cost { get; set; }
    public decimal Profit { get; set; }
}

public class ProfitByProductDto
{
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string ProductName { get; set; } = default!;
    public int UnitsSold { get; set; }
    public decimal Revenue { get; set; }
    public decimal Cost { get; set; }
    public decimal Profit { get; set; }
    public decimal MarginPct { get; set; }
}

public class TopCustomerDto
{
    public Guid CustomerId { get; set; }
    public string CustomerCode { get; set; } = default!;
    public string CustomerName { get; set; } = default!;
    public int OrderCount { get; set; }
    public decimal Revenue { get; set; }
    public DateTime? LastOrderAt { get; set; }
}

public class SupplierSpendDto
{
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = default!;
    public int PoCount { get; set; }
    public decimal Spend { get; set; }
}

public class OperationalKpisDto
{
    public int OpenOrders { get; set; }
    public int OrdersInPreparation { get; set; }
    public int OrdersReadyToShip { get; set; }
    public int OrdersShipped { get; set; }
    public int LateOrders { get; set; }
    public decimal LateOrderPct { get; set; }
    /// <summary>Average hours from Submitted → Shipped over the last 30 days.</summary>
    public decimal AvgPrepHours { get; set; }
    /// <summary>Lines shipped complete / lines ordered, over the last 30 days.</summary>
    public decimal FillRatePct { get; set; }
}
