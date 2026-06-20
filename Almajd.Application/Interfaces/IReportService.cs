using Almajd.Application.Common;
using Almajd.Application.DTOs.Reports;

namespace Almajd.Application.Interfaces;

public interface IReportService
{
    Task<ApiResponse<IReadOnlyList<SalesReportPointDto>>> SalesAsync(SalesReportQuery query);
    Task<ApiResponse<IReadOnlyList<ProfitByProductDto>>> ProfitByProductAsync(DateTime? from, DateTime? to);
    Task<ApiResponse<IReadOnlyList<TopCustomerDto>>> TopCustomersAsync(DateTime? from, DateTime? to, int top = 20);
    Task<ApiResponse<IReadOnlyList<SupplierSpendDto>>> SupplierSpendAsync(DateTime? from, DateTime? to);
    Task<ApiResponse<OperationalKpisDto>> OperationalKpisAsync();
}
