using System.Security.Claims;
using Almajd.Application.DTOs.Crm;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Almajd.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep},{AppRoles.Accountant},{AppRoles.OpsManager}")]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customers;
    private readonly ICustomerCreditService _credit;

    public CustomersController(ICustomerService customers, ICustomerCreditService credit)
    {
        _customers = customers;
        _credit = credit;
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] CustomerSearchQuery query)
    {
        var r = await _customers.SearchAsync(query);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _customers.GetAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("by-code/{code}")]
    public async Task<IActionResult> GetByCode(string code)
    {
        var r = await _customers.GetByCodeAsync(code);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> Create([FromBody] CustomerCreateDto dto)
    {
        var r = await _customers.CreateAsync(dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CustomerUpdateDto dto)
    {
        var r = await _customers.UpdateAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var r = await _customers.DeleteAsync(id);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/status")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.OpsManager}")]
    public async Task<IActionResult> SetStatus(Guid id, [FromQuery] CustomerStatus status)
    {
        var r = await _customers.SetStatusAsync(id, status);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/tier")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.OpsManager}")]
    public async Task<IActionResult> SetTier(Guid id, [FromQuery] CustomerTier tier)
    {
        var r = await _customers.SetTierAsync(id, tier);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPost("{id:guid}/kyc")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep},{AppRoles.Accountant}")]
    [RequestSizeLimit(10_000_000)] // 10 MB
    public async Task<IActionResult> UploadKyc(Guid id, IFormFile file)
    {
        var r = await _customers.UploadKycAsync(id, file);
        return StatusCode(r.StatusCode, r);
    }

    [HttpGet("{id:guid}/credit-check")]
    public async Task<IActionResult> CreditCheck(Guid id, [FromQuery] decimal orderTotal)
    {
        var r = await _credit.CheckAsync(id, orderTotal);
        return StatusCode(r.StatusCode, r);
    }

    // ----- Contacts -----
    [HttpPost("{id:guid}/contacts")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> AddContact(Guid id, [FromBody] CustomerContactCreateDto dto)
    {
        var r = await _customers.AddContactAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("contacts/{contactId:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> UpdateContact(Guid contactId, [FromBody] CustomerContactUpdateDto dto)
    {
        var r = await _customers.UpdateContactAsync(contactId, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("contacts/{contactId:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> RemoveContact(Guid contactId)
    {
        var r = await _customers.RemoveContactAsync(contactId);
        return StatusCode(r.StatusCode, r);
    }

    // ----- Addresses -----
    [HttpPost("{id:guid}/addresses")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> AddAddress(Guid id, [FromBody] CustomerAddressCreateDto dto)
    {
        var r = await _customers.AddAddressAsync(id, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpPut("addresses/{addressId:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> UpdateAddress(Guid addressId, [FromBody] CustomerAddressUpdateDto dto)
    {
        var r = await _customers.UpdateAddressAsync(addressId, dto);
        return StatusCode(r.StatusCode, r);
    }

    [HttpDelete("addresses/{addressId:guid}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.SalesRep}")]
    public async Task<IActionResult> RemoveAddress(Guid addressId)
    {
        var r = await _customers.RemoveAddressAsync(addressId);
        return StatusCode(r.StatusCode, r);
    }

    // ----- Notes -----
    [HttpPost("{id:guid}/notes")]
    public async Task<IActionResult> AddNote(Guid id, [FromBody] CustomerNoteCreateDto dto)
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? authorId = Guid.TryParse(raw, out var parsed) ? parsed : null;

        var r = await _customers.AddNoteAsync(id, dto, authorId);
        return StatusCode(r.StatusCode, r);
    }
}
