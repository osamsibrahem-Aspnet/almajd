using Almajd.Application.Common;
using Almajd.Application.DTOs.Crm;

namespace Almajd.Application.Interfaces;

/// <summary>
/// Contract consumed by M4 Sales during order submission. The check answers:
/// "Can this customer take on this order amount given their current AR + credit limit?"
/// </summary>
public interface ICustomerCreditService
{
    Task<ApiResponse<CreditCheckResultDto>> CheckAsync(Guid customerId, decimal orderTotal);
}
