using Almajd.Application.Common;
using Almajd.Application.DTOs.Inventory;

namespace Almajd.Application.Interfaces;

public interface IInventoryService
{
    // Stock queries
    Task<ApiResponse<PagedResult<StockItemDto>>> SearchStockAsync(StockSearchQuery query);
    Task<ApiResponse<PagedResult<StockMovementDto>>> SearchMovementsAsync(MovementSearchQuery query);

    // Manual operations (admin / warehouse staff)
    Task<ApiResponse<StockItemDto>> ReceiveAsync(ReceiveStockDto dto, Guid? userId);
    Task<ApiResponse<StockItemDto>> AdjustAsync(AdjustStockDto dto, Guid? userId);
    Task<ApiResponse> TransferAsync(TransferStockDto dto, Guid? userId);

    // Reservation primitives (consumed by Sales/Orders later)
    Task<ApiResponse<StockItemDto>> ReserveAsync(ReserveStockDto dto, Guid? userId);
    Task<ApiResponse<StockItemDto>> ReleaseAsync(ReserveStockDto dto, Guid? userId);
    Task<ApiResponse<StockItemDto>> ConfirmSaleAsync(ConfirmSaleDto dto, Guid? userId);
}
