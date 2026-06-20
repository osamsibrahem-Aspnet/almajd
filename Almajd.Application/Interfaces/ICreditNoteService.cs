using Almajd.Application.Common;
using Almajd.Application.DTOs.Billing;

namespace Almajd.Application.Interfaces;

public interface ICreditNoteService
{
    Task<ApiResponse<IReadOnlyList<CreditNoteDto>>> ListByInvoiceAsync(Guid invoiceId);
    Task<ApiResponse<CreditNoteDto>> CreateAsync(CreditNoteCreateDto dto, Guid? userId);
}
