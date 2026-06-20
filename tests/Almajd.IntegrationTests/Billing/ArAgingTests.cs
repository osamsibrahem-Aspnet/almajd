using System.Net;
using System.Net.Http.Json;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.DTOs.Sales;
using Almajd.Infrastructure.Persistence;
using Almajd.IntegrationTests.Infrastructure;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Almajd.IntegrationTests.Billing;

/// <summary>
/// Tests for AR aging report bucketing (0-30, 31-60, 61-90, 90+).
/// Uses the asOf query parameter to control which bucket each invoice falls into.
/// </summary>
[Collection("Almajd")]
public class ArAgingTests
{
    private readonly AlmajdFixture _fixture;

    public ArAgingTests(AlmajdFixture fixture)
    {
        _fixture = fixture;
    }

    /// <summary>
    /// Forces an invoice's DueAt to a specific past date so we can control its aging bucket.
    /// </summary>
    private async Task SetInvoiceDueAtAsync(Guid invoiceId, DateTime dueAt)
    {
        using var scope = _fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var inv = await db.Invoices.FirstAsync(i => i.Id == invoiceId);
        inv.DueAt = dueAt;
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task ArAgingReport_BucketsInvoicesCorrectly()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory, unitPrice: 100m);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        var asOf = new DateTime(2025, 6, 15, 0, 0, 0, DateTimeKind.Utc);

        // Bucket 0-30: due 5 days before asOf → 5 days overdue.
        var (_, _, inv1) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 100m);
        await SetInvoiceDueAtAsync(inv1.Id, asOf.AddDays(-5));

        // Bucket 31-60: due 45 days before asOf → 45 days overdue.
        var (_, _, inv2) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 100m);
        await SetInvoiceDueAtAsync(inv2.Id, asOf.AddDays(-45));

        // Bucket 61-90: due 75 days before asOf → 75 days overdue.
        var (_, _, inv3) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 100m);
        await SetInvoiceDueAtAsync(inv3.Id, asOf.AddDays(-75));

        // Bucket 90+: due 120 days before asOf → 120 days overdue.
        var (_, _, inv4) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 100m);
        await SetInvoiceDueAtAsync(inv4.Id, asOf.AddDays(-120));

        var asOfParam = asOf.ToString("o");
        var response = await client.GetAsync($"/api/ar/aging?asOf={Uri.EscapeDataString(asOfParam)}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var report = (await response.ReadApiResponseAsync<ArAgingReportDto>()).Data!;

        var totals = report.Totals.ToDictionary(b => b.Bucket, b => b.Amount);

        totals["0-30"].Should().BeGreaterThanOrEqualTo(100m,
            "invoice due 5 days ago should be in the 0-30 bucket");
        totals["31-60"].Should().BeGreaterThanOrEqualTo(100m,
            "invoice due 45 days ago should be in the 31-60 bucket");
        totals["61-90"].Should().BeGreaterThanOrEqualTo(100m,
            "invoice due 75 days ago should be in the 61-90 bucket");
        totals["90+"].Should().BeGreaterThanOrEqualTo(100m,
            "invoice due 120 days ago should be in the 90+ bucket");
    }

    [Fact]
    public async Task ArAgingReport_VoidedInvoice_DoesNotAppear()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory, unitPrice: 100m);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        var (_, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 100m);

        await SetInvoiceDueAtAsync(invoice.Id, DateTime.UtcNow.AddDays(-10));

        // Void it.
        var voidDto = new VoidInvoiceDto { Reason = "Aging test" };
        (await client.PostAsJsonAsync($"/api/invoices/{invoice.Id}/void", voidDto))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var response = await client.GetAsync("/api/ar/aging");
        var report = (await response.ReadApiResponseAsync<ArAgingReportDto>()).Data!;

        report.Totals.Sum(b => b.Amount).Should().Be(0m,
            "a voided invoice must not appear in the aging report when it is the only invoice");
    }

    [Fact]
    public async Task ArAgingReport_PaidInvoice_DoesNotAppear()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory, unitPrice: 100m);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        var (customerId, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 100m);

        await SetInvoiceDueAtAsync(invoice.Id, DateTime.UtcNow.AddDays(-15));

        // Fully pay it.
        var paymentDto = new PaymentCreateDto
        {
            CustomerId = customerId,
            Amount = invoice.Total,
            Method = Almajd.Domain.Enums.PaymentMethod.Cash,
            Currency = "EGP",
            Allocations = new List<PaymentAllocationInputDto>
            {
                new() { InvoiceId = invoice.Id, Amount = invoice.Total }
            }
        };
        (await client.PostAsJsonAsync("/api/payments", paymentDto))
            .StatusCode.Should().Be(HttpStatusCode.Created);

        var response = await client.GetAsync("/api/ar/aging");
        var report = (await response.ReadApiResponseAsync<ArAgingReportDto>()).Data!;

        report.Totals.Sum(b => b.Amount).Should().Be(0m,
            "a fully paid invoice must not appear in the aging report");
    }

    [Fact]
    public async Task ArAgingReport_PerCustomerDrillDown_MatchesAggregateTotals()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory, unitPrice: 100m);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        var asOf = new DateTime(2025, 6, 15, 0, 0, 0, DateTimeKind.Utc);

        var (customerId, _, invoice) = await SeedHelpers.CreateFullInvoiceScenarioAsync(
            client, _fixture.Factory, skuId, locationId, qty: 1, unitPrice: 100m);
        await SetInvoiceDueAtAsync(invoice.Id, asOf.AddDays(-40));

        var asOfParam = asOf.ToString("o");

        // Aggregate.
        var aggResp = await client.GetAsync($"/api/ar/aging?asOf={Uri.EscapeDataString(asOfParam)}");
        var agg = (await aggResp.ReadApiResponseAsync<ArAgingReportDto>()).Data!;

        // Per-customer drill-down.
        var custResp = await client.GetAsync(
            $"/api/ar/aging/customer/{customerId}?asOf={Uri.EscapeDataString(asOfParam)}");
        custResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var custRow = (await custResp.ReadApiResponseAsync<CustomerArAgingDto>()).Data!;

        custRow.CustomerId.Should().Be(customerId);
        custRow.Bucket31To60.Should().BeGreaterThanOrEqualTo(100m,
            "invoice due 40 days ago should appear in 31-60 bucket for the customer");

        // The aggregate 31-60 should contain at least what the customer shows.
        var agg3160 = agg.Totals.First(b => b.Bucket == "31-60").Amount;
        agg3160.Should().BeGreaterThanOrEqualTo(custRow.Bucket31To60,
            "customer drill-down must not exceed aggregate");
    }
}
