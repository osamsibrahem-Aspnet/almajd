using System.ComponentModel.DataAnnotations;
using Almajd.Domain.Enums;

namespace Almajd.Application.DTOs.Fulfilment;

public class PickListLineDto
{
    public Guid Id { get; set; }
    public Guid OrderLineId { get; set; }
    public Guid SkuId { get; set; }
    public string SkuCode { get; set; } = default!;
    public string Barcode { get; set; } = default!;
    public string ProductName { get; set; } = default!;
    public Guid LocationId { get; set; }
    public string LocationAddress { get; set; } = default!;
    public int RequestedQty { get; set; }
    public int PickedQty { get; set; }
    public bool IsShort { get; set; }
    public string? ShortReason { get; set; }
    public bool IsComplete { get; set; }
}

public class PickListDto
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = default!;
    public string CustomerName { get; set; } = default!;
    public PickListStatus Status { get; set; }
    public DateTime GeneratedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public Guid? PickedByUserId { get; set; }
    public string? PickedByName { get; set; }
    public int TotalLines { get; set; }
    public int CompletedLines { get; set; }
}

public class PickListDetailDto : PickListDto
{
    public IReadOnlyList<PickListLineDto> Lines { get; set; } = Array.Empty<PickListLineDto>();
}

public class PickLineInputDto
{
    [Range(0, int.MaxValue)] public int Qty { get; set; }
    [Required] public string ScannedSku { get; set; } = default!;
    [Required] public string ScannedLocation { get; set; } = default!;
}

public class MarkShortInputDto
{
    [StringLength(512)] public string? Reason { get; set; }
}

public class PickListSearchQuery
{
    public PickListStatus? Status { get; set; }
    public Guid? OrderId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
