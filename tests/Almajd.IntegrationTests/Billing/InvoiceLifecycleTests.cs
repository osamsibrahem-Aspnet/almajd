using System.Net;
using System.Net.Http.Json;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.DTOs.Crm;
using Almajd.Application.DTOs.Sales;
using Almajd.IntegrationTests.Infrastructure;
using FluentAssertions;

namespace Almajd.IntegrationTests.Billing;

/// <summary>
/// Tests the invoice lifecycle: issue → void, and the AR reversal on void.
/// Also validates that voiding an invoice with payments allocated returns 409.
/// </summary>
[Collection("Almajd")]
public class InvoiceLifecycleTests
{
    private readonly AlmajdFixture _fixture;

    public InvoiceLifecycleTests(AlmajdFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task VoidInvoice_WithReason_ReversesCustomerAr()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        var (customerId, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId);

        var customerMid = (await (await client.GetAsync($"/api/customers/{customerId}"))
            .ReadApiResponseAsync<CustomerDto>()).Data!;
        var arAfterIssue = customerMid.CurrentAr;

        // Void the invoice.
        var voidDto = new VoidInvoiceDto { Reason = "Test void reason" };
        var voidResp = await client.PostAsJsonAsync($"/api/invoices/{invoice.Id}/void", voidDto);
        voidResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var voided = (await voidResp.ReadApiResponseAsync<InvoiceDto>()).Data!;
        voided.Status.Should().Be(Almajd.Domain.Enums.InvoiceStatus.Void);
        voided.VoidReason.Should().Be("Test void reason");
        voided.VoidedAt.Should().NotBeNull();

        // AR should be back to pre-invoice level.
        var customerAfter = (await (await client.GetAsync($"/api/customers/{customerId}"))
            .ReadApiResponseAsync<CustomerDto>()).Data!;

        customerAfter.CurrentAr.Should().Be(arAfterIssue - invoice.Total,
            "voiding an invoice must reduce customer AR by the invoice total");
    }

    [Fact]
    public async Task VoidInvoice_WithPaymentAllocated_Returns409()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory, unitPrice: 500m);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        var (customerId, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 500m);

        // Record a payment and allocate to the invoice.
        var paymentDto = new PaymentCreateDto
        {
            CustomerId = customerId,
            Amount = 100m,
            Method = Almajd.Domain.Enums.PaymentMethod.Cash,
            Currency = "EGP",
            Allocations = new List<PaymentAllocationInputDto>
            {
                new() { InvoiceId = invoice.Id, Amount = 100m }
            }
        };
        var payResp = await client.PostAsJsonAsync("/api/payments", paymentDto);
        payResp.StatusCode.Should().Be(HttpStatusCode.Created);

        // Attempt to void.
        var voidDto = new VoidInvoiceDto { Reason = "Should fail" };
        var voidResp = await client.PostAsJsonAsync($"/api/invoices/{invoice.Id}/void", voidDto);

        voidResp.StatusCode.Should().Be(HttpStatusCode.Conflict,
            "cannot void an invoice that has payments allocated");
    }

    [Fact]
    public async Task VoidInvoice_AlreadyVoided_Returns409()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        var (_, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId);

        var voidDto = new VoidInvoiceDto { Reason = "First void" };
        var first = await client.PostAsJsonAsync($"/api/invoices/{invoice.Id}/void", voidDto);
        first.StatusCode.Should().Be(HttpStatusCode.OK);

        var second = await client.PostAsJsonAsync($"/api/invoices/{invoice.Id}/void", voidDto);
        second.StatusCode.Should().Be(HttpStatusCode.Conflict,
            "voiding an already-void invoice should return 409");
    }

    [Fact]
    public async Task IssueInvoice_IsIdempotent_ReturnsSameInvoiceOnRetry()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        var (_, orderId, invoice1) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId);

        // Issue again for the same order — should return the existing invoice.
        var invoice2 = await SeedHelpers.IssueInvoiceAsync(client, orderId);

        invoice2.Should().NotBeNull();
        invoice2!.Id.Should().Be(invoice1.Id, "issuing twice for the same order must return the same invoice");
        invoice2.Number.Should().Be(invoice1.Number);
    }
}
