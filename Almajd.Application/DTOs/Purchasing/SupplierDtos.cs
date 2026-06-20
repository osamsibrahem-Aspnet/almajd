using System.ComponentModel.DataAnnotations;

namespace Almajd.Application.DTOs.Purchasing;

public class SupplierDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? TaxId { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }
    public int PaymentTermsNetDays { get; set; }
    public string Currency { get; set; } = default!;
    public bool IsActive { get; set; }
    public int SuppliedSkuCount { get; set; }
}

public class SupplierCreateDto
{
    [Required, StringLength(256)] public string Name { get; set; } = default!;
    [StringLength(64)] public string? TaxId { get; set; }
    [Phone, StringLength(32)] public string? Phone { get; set; }
    [EmailAddress, StringLength(256)] public string? Email { get; set; }
    [StringLength(512)] public string? Address { get; set; }
    [StringLength(128)] public string? ContactPerson { get; set; }
    [Range(0, 365)] public int PaymentTermsNetDays { get; set; }
    [StringLength(8)] public string Currency { get; set; } = "EGP";
}

public class SupplierUpdateDto : SupplierCreateDto
{
    public bool IsActive { get; set; }
}

public class SupplierSearchQuery
{
    public string? Search { get; set; }
    public bool? IsActive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class SupplierSkuDto
{
    public Guid Id { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = default!;
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string ProductName { get; set; } = default!;
    public string? SupplierSkuCode { get; set; }
    public int LeadTimeDays { get; set; }
    public decimal CostPrice { get; set; }
    public string Currency { get; set; } = default!;
    public bool IsPreferred { get; set; }
}

public class SupplierSkuUpsertDto
{
    [Required] public Guid SkuId { get; set; }
    [StringLength(64)] public string? SupplierSkuCode { get; set; }
    [Range(0, 365)] public int LeadTimeDays { get; set; }
    [Range(0.01, double.MaxValue)] public decimal CostPrice { get; set; }
    [StringLength(8)] public string Currency { get; set; } = "EGP";
    public bool IsPreferred { get; set; }
}

public class SupplierPriceCompareItemDto
{
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = default!;
    public string? SupplierSkuCode { get; set; }
    public int LeadTimeDays { get; set; }
    public decimal CostPrice { get; set; }
    public string Currency { get; set; } = default!;
    public bool IsPreferred { get; set; }
}
