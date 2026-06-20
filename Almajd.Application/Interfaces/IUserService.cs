using Almajd.Application.Common;
using Almajd.Application.DTOs.Users;

namespace Almajd.Application.Interfaces;

public interface IUserService
{
    Task<ApiResponse<PagedResult<UserListItemDto>>> SearchAsync(UserSearchQuery query);
    Task<ApiResponse<UserDetailDto>> GetAsync(Guid id);

    Task<ApiResponse<UserDetailDto>> CreateStaffAsync(CreateStaffUserDto dto);
    Task<ApiResponse<UserDetailDto>> SetRolesAsync(Guid id, SetUserRolesDto dto);
    Task<ApiResponse> DeactivateAsync(Guid id);
    Task<ApiResponse> ActivateAsync(Guid id);

    Task<ApiResponse<IReadOnlyList<string>>> ListRolesAsync();
}
