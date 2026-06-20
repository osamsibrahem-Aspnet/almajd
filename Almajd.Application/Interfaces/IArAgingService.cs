using Almajd.Application.Common;
using Almajd.Application.DTOs.Billing;

namespace Almajd.Application.Interfaces;

public interface IArAgingService
{
    Task<ApiResponse<ArAgingReportDto>> ComputeAsync(DateTime? asOf = null);
    Task<ApiResponse<CustomerArAgingDto>> ForCustomerAsync(Guid customerId, DateTime? asOf = null);
}
