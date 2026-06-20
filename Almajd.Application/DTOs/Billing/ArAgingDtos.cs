namespace Almajd.Application.DTOs.Billing;

public class ArAgingBucketDto
{
    public string Bucket { get; set; } = default!;       // 0-30, 31-60, 61-90, 90+
    public decimal Amount { get; set; }
    public int InvoiceCount { get; set; }
}

public class CustomerArAgingDto
{
    public Guid CustomerId { get; set; }
    public string CustomerCode { get; set; } = default!;
    public string CustomerName { get; set; } = default!;
    public decimal CurrentAr { get; set; }
    public decimal Bucket0To30 { get; set; }
    public decimal Bucket31To60 { get; set; }
    public decimal Bucket61To90 { get; set; }
    public decimal Bucket90Plus { get; set; }
}

public class ArAgingReportDto
{
    public DateTime AsOf { get; set; }
    public IReadOnlyList<ArAgingBucketDto> Totals { get; set; } = Array.Empty<ArAgingBucketDto>();
    public IReadOnlyList<CustomerArAgingDto> ByCustomer { get; set; } = Array.Empty<CustomerArAgingDto>();
}
