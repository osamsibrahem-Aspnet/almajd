using Almajd.Application.Common;
using Almajd.Application.DTOs.Billing;

namespace Almajd.Application.Interfaces;

public interface IPaymentService
{
    Task<ApiResponse<PagedResult<PaymentDto>>> SearchAsync(PaymentSearchQuery query);
    Task<ApiResponse<PaymentDto>> GetAsync(Guid id);
    Task<ApiResponse<PaymentDto>> RecordAsync(PaymentCreateDto dto, Guid? userId);
}
