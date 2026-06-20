using Almajd.Application.Common;
using Almajd.Application.DTOs.Crm;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;

namespace Almajd.Application.Services;

public class CustomerCreditService : ICustomerCreditService
{
    private readonly IUnitOfWork _uow;

    public CustomerCreditService(IUnitOfWork uow) => _uow = uow;

    public async Task<ApiResponse<CreditCheckResultDto>> CheckAsync(Guid customerId, decimal orderTotal)
    {
        var customer = await _uow.Repository<Customer>().GetByIdAsync(customerId);
        if (customer is null)
            return ApiResponse<CreditCheckResultDto>.Fail(404, "Customer not found.");

        if (customer.Status == CustomerStatus.Suspended)
            return ApiResponse<CreditCheckResultDto>.Ok(new CreditCheckResultDto
            {
                CustomerId = customerId,
                Approved = false,
                RequiresReview = true,
                Reason = "Customer is suspended.",
                CreditLimit = customer.CreditLimit,
                CurrentAr = customer.CurrentAr,
                OrderTotal = orderTotal,
                Projected = customer.CurrentAr + orderTotal,
                RemainingHeadroom = 0
            });

        var projected = customer.CurrentAr + orderTotal;
        var headroom = customer.CreditLimit - projected;

        // VIPs bypass the cap; others require review when projected exceeds the limit.
        var overLimit = projected > customer.CreditLimit;
        var approved = !overLimit || customer.Tier == CustomerTier.Vip;
        var requiresReview = overLimit && customer.Tier != CustomerTier.Vip;

        var reason = requiresReview
            ? $"Projected AR ({projected:N2}) exceeds credit limit ({customer.CreditLimit:N2})."
            : approved
                ? null
                : "Order rejected.";

        return ApiResponse<CreditCheckResultDto>.Ok(new CreditCheckResultDto
        {
            CustomerId = customerId,
            Approved = approved,
            RequiresReview = requiresReview,
            Reason = reason,
            CreditLimit = customer.CreditLimit,
            CurrentAr = customer.CurrentAr,
            OrderTotal = orderTotal,
            Projected = projected,
            RemainingHeadroom = Math.Max(0, headroom)
        });
    }
}
