using Almajd.Application.Common;
using Almajd.Application.DTOs.Billing;

namespace Almajd.Application.Interfaces;

public interface IInvoiceService
{
    Task<ApiResponse<PagedResult<InvoiceListItemDto>>> SearchAsync(InvoiceSearchQuery query);
    Task<ApiResponse<InvoiceDto>> GetAsync(Guid id);
    Task<ApiResponse<InvoiceDto>> GetByNumberAsync(string number);

    Task<ApiResponse<InvoiceDto>> IssueFromOrderAsync(IssueInvoiceFromOrderDto dto);
    Task<ApiResponse<InvoiceDto>> VoidAsync(Guid id, VoidInvoiceDto dto);

    Task<ApiResponse<byte[]>> ExportPdfAsync(Guid id);
}
