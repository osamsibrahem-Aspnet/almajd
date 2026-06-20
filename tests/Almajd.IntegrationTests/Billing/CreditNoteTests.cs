using System.Net;
using System.Net.Http.Json;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.DTOs.Crm;
using Almajd.IntegrationTests.Infrastructure;
using FluentAssertions;

namespace Almajd.IntegrationTests.Billing;

/// <summary>
/// Tests for credit note creation against invoices.
/// Validates AR reduction, over-credit prevention, and void-invoice gating.
/// </summary>
[Collection("Almajd")]
public class CreditNoteTests
{
    private readonly AlmajdFixture _fixture;

    public CreditNoteTests(AlmajdFixture fixture)
    {
        _fixture = fixture;
    }

    private async Task<(HttpClient Client, Guid SkuId, Guid LocationId)> SetupAsync()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory, unitPrice: 300m);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);
        return (client, skuId, locationId);
    }

    [Fact]
    public async Task CreateCreditNote_BelowInvoiceTotal_ReducesCustomerAr()
    {
        var (client, skuId, locationId) = await SetupAsync();

        var (customerId, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 300m);

        var customerBefore = (await (await client.GetAsync($"/api/customers/{customerId}"))
            .ReadApiResponseAsync<CustomerDto>()).Data!;
        var arBefore = customerBefore.CurrentAr;

        var creditDto = new CreditNoteCreateDto
        {
            InvoiceId = invoice.Id,
            Amount = 100m,
            Reason = "Partial return"
        };
        var response = await client.PostAsJsonAsync("/api/creditnotes", creditDto);
        response.StatusCode.Should().Be(HttpStatusCode.Created,
            "a credit note below the invoice total should succeed");

        var creditNote = (await response.ReadApiResponseAsync<CreditNoteDto>()).Data!;
        creditNote.Amount.Should().Be(100m);
        creditNote.InvoiceId.Should().Be(invoice.Id);

        var customerAfter = (await (await client.GetAsync($"/api/customers/{customerId}"))
            .ReadApiResponseAsync<CustomerDto>()).Data!;

        customerAfter.CurrentAr.Should().Be(arBefore - 100m,
            "customer AR must decrease by the credit note amount");
    }

    [Fact]
    public async Task CreateSecondCreditNote_ThatPushesTotalBeyondInvoice_Returns400()
    {
        var (client, skuId, locationId) = await SetupAsync();

        var (customerId, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 300m);

        // First credit: 200 (OK — invoice total = 300)
        var first = new CreditNoteCreateDto { InvoiceId = invoice.Id, Amount = 200m, Reason = "First partial" };
        var r1 = await client.PostAsJsonAsync("/api/creditnotes", first);
        r1.StatusCode.Should().Be(HttpStatusCode.Created);

        // Second credit: 150 — total would be 350 > 300 invoice
        var second = new CreditNoteCreateDto { InvoiceId = invoice.Id, Amount = 150m, Reason = "Over-credit attempt" };
        var r2 = await client.PostAsJsonAsync("/api/creditnotes", second);
        r2.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "a second credit note that pushes total credits beyond invoice total must be rejected");
    }

    [Fact]
    public async Task CreateCreditNote_OnVoidedInvoice_Returns409()
    {
        var (client, skuId, locationId) = await SetupAsync();

        var (_, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 300m);

        // Void the invoice first.
        var voidDto = new VoidInvoiceDto { Reason = "Voiding for test" };
        var voidResp = await client.PostAsJsonAsync($"/api/invoices/{invoice.Id}/void", voidDto);
        voidResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Attempt credit note on voided invoice.
        var creditDto = new CreditNoteCreateDto
        {
            InvoiceId = invoice.Id,
            Amount = 50m,
            Reason = "Should fail on void"
        };
        var creditResp = await client.PostAsJsonAsync("/api/creditnotes", creditDto);
        creditResp.StatusCode.Should().Be(HttpStatusCode.Conflict,
            "credit notes on voided invoices must be rejected");
    }

    [Fact]
    public async Task ListCreditNotesByInvoice_ReturnsOnlyThatInvoicesNotes()
    {
        var (client, skuId, locationId) = await SetupAsync();

        var (_, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 300m);

        var cn1 = new CreditNoteCreateDto { InvoiceId = invoice.Id, Amount = 50m, Reason = "CN1" };
        var cn2 = new CreditNoteCreateDto { InvoiceId = invoice.Id, Amount = 75m, Reason = "CN2" };

        (await client.PostAsJsonAsync("/api/creditnotes", cn1)).StatusCode.Should().Be(HttpStatusCode.Created);
        (await client.PostAsJsonAsync("/api/creditnotes", cn2)).StatusCode.Should().Be(HttpStatusCode.Created);

        var listResp = await client.GetAsync($"/api/creditnotes/invoice/{invoice.Id}");
        listResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = (await listResp.ReadApiResponseAsync<IReadOnlyList<CreditNoteDto>>()).Data!;
        list.Should().HaveCount(2, "both credit notes should be listed for the invoice");
        list.Select(c => c.Amount).Should().BeEquivalentTo(new[] { 75m, 50m },
            "ordered descending by issuance");
    }
}
