using System.Net;
using System.Net.Http.Json;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.DTOs.Crm;
using Almajd.Application.DTOs.Sales;
using Almajd.IntegrationTests.Infrastructure;
using FluentAssertions;

namespace Almajd.IntegrationTests.Billing;

/// <summary>
/// Canary test suite for the gapless invoice numbering guarantee.
/// Tests the SqlServerInvoiceNumberGenerator UPDLOCK+HOLDLOCK mechanism end-to-end.
/// A gap or duplicate in concurrent issuance is a critical billing defect.
/// </summary>
[Collection("Almajd")]
public class InvoiceNumberingTests
{
    private readonly AlmajdFixture _fixture;

    public InvoiceNumberingTests(AlmajdFixture fixture)
    {
        _fixture = fixture;
    }

    // ---- helpers ----

    private async Task<(HttpClient Client, Guid SkuId, Guid LocationId)> SetupAsync()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);
        return (client, skuId, locationId);
    }

    // ---- tests ----

    [Fact]
    public async Task IssueInvoice_AssignsSequentialNumber_WithCorrectFormat()
    {
        var (client, skuId, locationId) = await SetupAsync();
        var year = DateTime.UtcNow.Year;

        var (_, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId);

        invoice.Number.Should().Be($"INV-{year}-000001",
            "the first invoice of the year should get sequence 000001");
    }

    [Fact]
    public async Task IssueMultipleInvoices_AssignsConsecutiveNumbers_NoGaps()
    {
        var (client, skuId, locationId) = await SetupAsync();
        var year = DateTime.UtcNow.Year;
        const int count = 10;

        var numbers = new List<string>(count);

        for (var i = 0; i < count; i++)
        {
            var (_, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
                client, _fixture.Factory, skuId, locationId, qty: 1);
            numbers.Add(invoice.Number);
        }

        numbers.Should().HaveCount(count);
        numbers.Should().OnlyHaveUniqueItems("sequential issuance must produce unique numbers");

        var expected = Enumerable.Range(1, count)
            .Select(n => $"INV-{year}-{n:D6}")
            .ToHashSet();

        numbers.ToHashSet().Should().BeEquivalentTo(expected,
            "sequential issuance should produce consecutive numbers with no gaps");
    }

    [Theory]
    [InlineData(10)]
    [InlineData(20)]
    [InlineData(50)]
    public async Task ConcurrentInvoiceIssue_NoGaps_NoDuplicates(int concurrency)
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        // Pre-seed enough stock for all concurrent orders
        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, concurrency * 10);

        // Create `concurrency` customers and approved orders, then force them all to Shipped.
        var orderIds = new List<Guid>(concurrency);
        for (var i = 0; i < concurrency; i++)
        {
            var customer = await SeedHelpers.CreateCustomerAsync(client);
            var order = await SeedHelpers.CreateAndSubmitOrderAsync(client, customer.Id,
                new List<OrderLineInputDto> { new() { SkuId = skuId, Qty = 1 } });

            order.Should().NotBeNull($"order {i} should be created successfully");
            if (order?.Status == Almajd.Domain.Enums.OrderStatus.Approved)
            {
                await SeedHelpers.ForceOrderToShippedAsync(_fixture.Factory, order.Id);
                orderIds.Add(order.Id);
            }
        }

        orderIds.Should().HaveCount(concurrency, "all orders should reach Approved+Shipped state");

        // Fire all invoice issuance requests in parallel, each with its own HttpClient.
        var year = DateTime.UtcNow.Year;
        var tasks = orderIds.Select(async orderId =>
        {
            // Each parallel task gets its own client to avoid shared state.
            var taskClient = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
            var dto = new IssueInvoiceFromOrderDto { OrderId = orderId };
            var response = await taskClient.PostAsJsonAsync("/api/invoices/issue-from-order", dto);
            return response;
        });

        var responses = await Task.WhenAll(tasks);

        var successfulInvoices = new List<InvoiceDto>();
        var failureMessages = new List<string>();
        foreach (var response in responses)
        {
            if (response.IsSuccessStatusCode)
            {
                var api = await response.ReadApiResponseAsync<InvoiceDto>();
                if (api.Data is not null)
                    successfulInvoices.Add(api.Data);
            }
            else
            {
                var body = await response.Content.ReadAsStringAsync();
                failureMessages.Add($"HTTP {(int)response.StatusCode}: {body}");
            }
        }

        // All should succeed (idempotent — a retry returns the same invoice, which is fine)
        successfulInvoices.Should().HaveCount(concurrency,
            $"every order should get exactly one invoice issued. Failures: {string.Join("; ", failureMessages.Take(3))}");

        var numbers = successfulInvoices.Select(i => i.Number).ToList();

        // No duplicates
        numbers.Should().OnlyHaveUniqueItems("concurrent issuance must never produce duplicate invoice numbers");

        // No gaps: the set should be exactly INV-{year}-000001 through INV-{year}-{concurrency:D6}
        var expected = Enumerable.Range(1, concurrency)
            .Select(n => $"INV-{year}-{n:D6}")
            .ToHashSet();

        numbers.ToHashSet().Should().BeEquivalentTo(expected,
            $"concurrent issuance of {concurrency} invoices must produce a gapless sequence");
    }

    [Fact]
    public async Task IssueInvoiceForNonShippedOrder_FailsWith409()
    {
        var (client, skuId, locationId) = await SetupAsync();

        var customer = await SeedHelpers.CreateCustomerAsync(client);
        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 50);

        var order = await SeedHelpers.CreateAndSubmitOrderAsync(client, customer.Id,
            new List<OrderLineInputDto> { new() { SkuId = skuId, Qty = 1 } });

        order.Should().NotBeNull();
        order!.Status.Should().Be(Almajd.Domain.Enums.OrderStatus.Approved);

        // Attempt to invoice an Approved (not yet Shipped) order.
        var dto = new IssueInvoiceFromOrderDto { OrderId = order.Id };
        var response = await client.PostAsJsonAsync("/api/invoices/issue-from-order", dto);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict,
            "invoicing requires order to be in Shipped/Delivered state");
    }

    [Fact]
    public async Task IssueInvoice_UpdatesCustomerCurrentAr_AtomicallyWithInvoice()
    {
        var (client, skuId, locationId) = await SetupAsync();

        var customer = await SeedHelpers.CreateCustomerAsync(client);
        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 50);

        // Get AR before.
        var customerBefore = (await (await client.GetAsync($"/api/customers/{customer.Id}"))
            .ReadApiResponseAsync<CustomerDto>()).Data!;
        var arBefore = customerBefore.CurrentAr;

        var order = await SeedHelpers.CreateAndSubmitOrderAsync(client, customer.Id,
            new List<OrderLineInputDto> { new() { SkuId = skuId, Qty = 2 } });

        order!.Status.Should().Be(Almajd.Domain.Enums.OrderStatus.Approved);
        await SeedHelpers.ForceOrderToShippedAsync(_fixture.Factory, order.Id);

        var invoice = await SeedHelpers.IssueInvoiceAsync(client, order.Id);
        invoice.Should().NotBeNull();

        // Get AR after.
        var customerAfter = (await (await client.GetAsync($"/api/customers/{customer.Id}"))
            .ReadApiResponseAsync<CustomerDto>()).Data!;

        customerAfter.CurrentAr.Should().Be(arBefore + invoice!.Total,
            "issuing an invoice must atomically increase the customer AR by the invoice total");
    }

    [Fact]
    public async Task GetInvoices_Anonymous_Returns401()
    {
        var anonClient = AuthHelpers.GetAnonymousClient(_fixture.Factory);
        var response = await anonClient.GetAsync("/api/invoices");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
