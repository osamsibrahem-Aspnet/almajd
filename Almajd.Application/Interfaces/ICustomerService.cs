using Almajd.Application.Common;
using Almajd.Application.DTOs.Crm;
using Almajd.Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace Almajd.Application.Interfaces;

public interface ICustomerService
{
    Task<ApiResponse<PagedResult<CustomerListItemDto>>> SearchAsync(CustomerSearchQuery query);
    Task<ApiResponse<CustomerDto>> GetAsync(Guid id);
    Task<ApiResponse<CustomerDto>> GetByCodeAsync(string code);
    Task<ApiResponse<CustomerDto>> CreateAsync(CustomerCreateDto dto);
    Task<ApiResponse<CustomerDto>> UpdateAsync(Guid id, CustomerUpdateDto dto);
    Task<ApiResponse> DeleteAsync(Guid id);

    Task<ApiResponse<CustomerDto>> SetStatusAsync(Guid id, CustomerStatus status);
    Task<ApiResponse<CustomerDto>> SetTierAsync(Guid id, CustomerTier tier);
    Task<ApiResponse<CustomerDto>> UploadKycAsync(Guid id, IFormFile file);

    // Contacts
    Task<ApiResponse<CustomerContactDto>> AddContactAsync(Guid customerId, CustomerContactCreateDto dto);
    Task<ApiResponse<CustomerContactDto>> UpdateContactAsync(Guid contactId, CustomerContactUpdateDto dto);
    Task<ApiResponse> RemoveContactAsync(Guid contactId);

    // Addresses
    Task<ApiResponse<CustomerAddressDto>> AddAddressAsync(Guid customerId, CustomerAddressCreateDto dto);
    Task<ApiResponse<CustomerAddressDto>> UpdateAddressAsync(Guid addressId, CustomerAddressUpdateDto dto);
    Task<ApiResponse> RemoveAddressAsync(Guid addressId);

    // Notes
    Task<ApiResponse<CustomerNoteDto>> AddNoteAsync(Guid customerId, CustomerNoteCreateDto dto, Guid? authorUserId);
}
