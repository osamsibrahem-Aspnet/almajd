using Almajd.Application.Common;
using Almajd.Application.DTOs.Purchasing;

namespace Almajd.Application.Interfaces;

public interface IReplenishmentService
{
    Task<ApiResponse<IReadOnlyList<ReplenishmentSuggestionDto>>> ListSuggestionsAsync(Guid? supplierId = null);
}
