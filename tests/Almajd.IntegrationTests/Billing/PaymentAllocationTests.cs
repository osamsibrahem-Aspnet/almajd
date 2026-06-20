using System.Net;
using System.Net.Http.Json;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.DTOs.Crm;
using Almajd.Application.DTOs.Sales;
using Almajd.IntegrationTests.Infrastructure;
using FluentAssertions;

namespace Almajd.IntegrationTests.Billing;

/// <summary>
/// Tests for payment recording and allocation to multiple invoices.
/// Verifies that AmountPaid, invoice Status, and customer AR are kept consistent.
/// </summary>
[Collection("Almajd")]
public class PaymentAllocationTests
{
    private readonly AlmajdFixture _fixture;

    public PaymentAllocationTests(AlmajdFixture fixture)
    {
        _fixture = fixture;
    }

    private async Task<(HttpClient Client, Guid SkuId, Guid LocationId)> SetupAsync()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory, unitPrice: 200m);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);
        return (client, skuId, locationId);
    }

    [Fact]
    public async Task RecordPayment_SplitAcrossThreeInvoices_UpdatesAmountPaidAndAr()
    {
        var (client, skuId, locationId) = await SetupAsync();

        // Create 3 invoices for the same customer.
        var customer = await SeedHelpers.CreateCustomerAsync(client);
        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 200);

        var invoiceIds = new List<Guid>();
        for (var i = 0; i < 3; i++)
        {
            var order = await SeedHelpers.CreateAndSubmitOrderAsync(client, customer.Id,
                new List<OrderLineInputDto> { new() { SkuId = skuId, Qty = 1 } });

            order!.Status.Should().Be(Almajd.Domain.Enums.OrderStatus.Approved);
            await SeedHelpers.ForceOrderToShippedAsync(_fixture.Factory, order.Id);
            var inv = await SeedHelpers.IssueInvoiceAsync(client, order.Id);
            inv.Should().NotBeNull();
            invoiceIds.Add(inv!.Id);
        }

        // Each invoice total = 200 EGP. Record a payment of 450 split: 150 / 150 / 150.
        var customerBefore = (await (await client.GetAsync($"/api/customers/{customer.Id}"))
            .ReadApiResponseAsync<CustomerDto>()).Data!;
        var arBefore = customerBefore.CurrentAr; // should be 600

        var paymentDto = new PaymentCreateDto
        {
            CustomerId = customer.Id,
            Amount = 450m,
            Method = Almajd.Domain.Enums.PaymentMethod.BankTransfer,
            Currency = "EGP",
            Allocations = invoiceIds.Select(id => new PaymentAllocationInputDto
            {
                InvoiceId = id,
                Amount = 150m
            }).ToList()
        };

        var payResp = await client.PostAsJsonAsync("/api/payments", paymentDto);
        payResp.StatusCode.Should().Be(HttpStatusCode.Created,
            "payment with valid split allocations should succeed");

        var payment = (await payResp.ReadApiResponseAsync<PaymentDto>()).Data!;
        payment.AllocatedAmount.Should().Be(450m);
        payment.Unallocated.Should().Be(0m);

        // Each invoice should now show 150 paid and remain in PartiallyPaid.
        foreach (var invoiceId in invoiceIds)
        {
            var inv = (await (await client.GetAsync($"/api/invoices/{invoiceId}"))
                .ReadApiResponseAsync<InvoiceDto>()).Data!;

            inv.AmountPaid.Should().Be(150m);
            inv.Status.Should().Be(Almajd.Domain.Enums.InvoiceStatus.PartiallyPaid);
        }

        // Customer AR should drop by 450.
        var customerAfter = (await (await client.GetAsync($"/api/customers/{customer.Id}"))
            .ReadApiResponseAsync<CustomerDto>()).Data!;

        customerAfter.CurrentAr.Should().Be(arBefore - 450m,
            "customer AR must drop by the allocated payment total");
    }

    [Fact]
    public async Task RecordPayment_AllocationExceedsOutstanding_Returns400()
    {
        var (client, skuId, locationId) = await SetupAsync();

        var (customerId, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 200m);

        // Invoice total = 200. Try to allocate 300.
        var paymentDto = new PaymentCreateDto
        {
            CustomerId = customerId,
            Amount = 300m,
            Method = Almajd.Domain.Enums.PaymentMethod.Cash,
            Currency = "EGP",
            Allocations = new List<PaymentAllocationInputDto>
            {
                new() { InvoiceId = invoice.Id, Amount = 300m }
            }
        };

        var response = await client.PostAsJsonAsync("/api/payments", paymentDto);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "allocation amount exceeding outstanding should be rejected");

        // Verify invoice was not modified.
        var inv = (await (await client.GetAsync($"/api/invoices/{invoice.Id}"))
            .ReadApiResponseAsync<InvoiceDto>()).Data!;
        inv.AmountPaid.Should().Be(0m, "nothing should have been persisted after validation failure");
    }

    [Fact]
    public async Task RecordPayment_AllocationSumExceedsPaymentAmount_Returns400()
    {
        var (client, skuId, locationId) = await SetupAsync();

        var customer = await SeedHelpers.CreateCustomerAsync(client);
        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 100);

        var order = await SeedHelpers.CreateAndSubmitOrderAsync(client, customer.Id,
            new List<OrderLineInputDto> { new() { SkuId = skuId, Qty = 1 } });
        await SeedHelpers.ForceOrderToShippedAsync(_fixture.Factory, order!.Id);
        var invoice = await SeedHelpers.IssueInvoiceAsync(client, order.Id);

        // Payment = 100, but allocation = 150.
        var paymentDto = new PaymentCreateDto
        {
            CustomerId = customer.Id,
            Amount = 100m,
            Method = Almajd.Domain.Enums.PaymentMethod.Cash,
            Currency = "EGP",
            Allocations = new List<PaymentAllocationInputDto>
            {
                new() { InvoiceId = invoice!.Id, Amount = 150m }
            }
        };

        var response = await client.PostAsJsonAsync("/api/payments", paymentDto);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "allocations cannot exceed the payment amount");
    }

    [Fact]
    public async Task RecordPayment_FullAllocation_SetsInvoiceStatusToPaid()
    {
        var (client, skuId, locationId) = await SetupAsync();

        var (customerId, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 200m);

        var paymentDto = new PaymentCreateDto
        {
            CustomerId = customerId,
            Amount = invoice.Total,
            Method = Almajd.Domain.Enums.PaymentMethod.BankTransfer,
            Currency = "EGP",
            Allocations = new List<PaymentAllocationInputDto>
            {
                new() { InvoiceId = invoice.Id, Amount = invoice.Total }
            }
        };

        var response = await client.PostAsJsonAsync("/api/payments", paymentDto);
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var inv = (await (await client.GetAsync($"/api/invoices/{invoice.Id}"))
            .ReadApiResponseAsync<InvoiceDto>()).Data!;

        inv.Status.Should().Be(Almajd.Domain.Enums.InvoiceStatus.Paid,
            "fully allocated invoice must transition to Paid status");
        inv.AmountPaid.Should().Be(invoice.Total);
    }
}
