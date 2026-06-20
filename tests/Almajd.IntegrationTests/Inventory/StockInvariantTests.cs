using System.Net;
using System.Net.Http.Json;
using Almajd.Application.DTOs.Inventory;
using Almajd.IntegrationTests.Infrastructure;
using FluentAssertions;

namespace Almajd.IntegrationTests.Inventory;

/// <summary>
/// Canary test suite for the stock reservation invariant: qtyReserved must never exceed qtyOnHand.
/// Tests both service-level guards and the concurrent-reservation scenario.
/// </summary>
[Collection("Almajd")]
public class StockInvariantTests
{
    private readonly AlmajdFixture _fixture;

    public StockInvariantTests(AlmajdFixture fixture)
    {
        _fixture = fixture;
    }

    private async Task<(HttpClient Client, Guid SkuId, Guid LocationId)> SetupAsync()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);
        return (client, skuId, locationId);
    }

    [Fact]
    public async Task Receive_IncreasesQtyOnHand_MovementRowExists()
    {
        var (client, skuId, locationId) = await SetupAsync();

        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 100);

        var stockResp = await client.GetAsync($"/api/inventory/stock?skuId={skuId}&locationId={locationId}");
        stockResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var stock = (await stockResp.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockItemDto>>())
            .Data!.Items.First();

        stock.QtyOnHand.Should().Be(100, "receiving 100 units should set QtyOnHand to 100");
        stock.QtyReserved.Should().Be(0);
        stock.QtyAvailable.Should().Be(100);

        // Movement row exists.
        var movResp = await client.GetAsync(
            $"/api/inventory/movements?skuId={skuId}&type={Almajd.Domain.Enums.StockMovementType.Receive}");
        var movements = (await movResp.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockMovementDto>>())
            .Data!.Items;

        movements.Should().Contain(m => m.Type == Almajd.Domain.Enums.StockMovementType.Receive && m.Quantity == 100,
            "a Receive movement row must be created");
    }

    [Fact]
    public async Task Reserve_AgainstAvailableStock_Succeeds()
    {
        var (client, skuId, locationId) = await SetupAsync();

        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 100);

        var reserveDto = new ReserveStockDto { SkuId = skuId, LocationId = locationId, Quantity = 60 };
        var response = await client.PostAsJsonAsync("/api/inventory/reserve", reserveDto);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var stock = (await response.ReadApiResponseAsync<StockItemDto>()).Data!;
        stock.QtyOnHand.Should().Be(100);
        stock.QtyReserved.Should().Be(60);
        stock.QtyAvailable.Should().Be(40);
    }

    [Fact]
    public async Task Reserve_BeyondAvailable_Fails_WithoutMutatingState()
    {
        var (client, skuId, locationId) = await SetupAsync();

        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 100);

        // First reserve: 60 (OK).
        var r1 = new ReserveStockDto { SkuId = skuId, LocationId = locationId, Quantity = 60 };
        (await client.PostAsJsonAsync("/api/inventory/reserve", r1))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        // Second reserve: 50 (would require 110 total reserved, but only 100 on hand) → should fail.
        var r2 = new ReserveStockDto { SkuId = skuId, LocationId = locationId, Quantity = 50 };
        var response = await client.PostAsJsonAsync("/api/inventory/reserve", r2);
        response.StatusCode.Should().Be(HttpStatusCode.Conflict,
            "reserving more than available should fail with 409");

        // State must be unchanged.
        var stockResp = await client.GetAsync($"/api/inventory/stock?skuId={skuId}&locationId={locationId}");
        var stock = (await stockResp.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockItemDto>>())
            .Data!.Items.First();

        stock.QtyReserved.Should().Be(60, "failed reservation must not mutate QtyReserved");
        stock.QtyOnHand.Should().Be(100, "failed reservation must not mutate QtyOnHand");
    }

    /// <summary>
    /// The invariant canary: fires N concurrent reservation requests each for 3 units
    /// against a location with only 10 units. Total demand > supply.
    /// After all settle: qtyReserved must NEVER exceed qtyOnHand.
    /// </summary>
    [Theory]
    [InlineData(5)]
    [InlineData(8)]
    public async Task ConcurrentReservations_NeverOversell(int concurrency)
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        // Receive exactly 10 units.
        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 10);

        // Fire `concurrency` parallel reservation requests, each for 3 units.
        // Total demand = concurrency * 3, which exceeds 10.
        var tasks = Enumerable.Range(0, concurrency).Select(async _ =>
        {
            var taskClient = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
            var dto = new ReserveStockDto { SkuId = skuId, LocationId = locationId, Quantity = 3 };
            return await taskClient.PostAsJsonAsync("/api/inventory/reserve", dto);
        });

        var responses = await Task.WhenAll(tasks);

        var successes = responses.Count(r => r.IsSuccessStatusCode);
        var failures = responses.Count(r => !r.IsSuccessStatusCode);

        successes.Should().BeGreaterThan(0, "at least some reservations should succeed");
        (successes + failures).Should().Be(concurrency);

        // The critical invariant: qtyReserved <= qtyOnHand (= 10).
        // At most 3 can succeed (3 * 3 = 9 ≤ 10), at most 4 could succeed (4 * 3 = 12 > 10).
        var stockResp = await client.GetAsync($"/api/inventory/stock?skuId={skuId}&locationId={locationId}");
        var stock = (await stockResp.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockItemDto>>())
            .Data!.Items.First();

        stock.QtyReserved.Should().BeLessThanOrEqualTo(stock.QtyOnHand,
            "INVARIANT: qtyReserved must never exceed qtyOnHand regardless of concurrency");

        stock.QtyReserved.Should().BeLessThanOrEqualTo(10,
            "cannot reserve more than was received");
    }

    [Fact]
    public async Task AdjustDown_BelowReserved_Returns400()
    {
        var (client, skuId, locationId) = await SetupAsync();

        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 10);

        var reserveDto = new ReserveStockDto { SkuId = skuId, LocationId = locationId, Quantity = 6 };
        (await client.PostAsJsonAsync("/api/inventory/reserve", reserveDto))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        // Adjust -5: would leave onHand=5, but reserved=6 → violates invariant.
        var adjustDto = new AdjustStockDto
        {
            SkuId = skuId,
            LocationId = locationId,
            Delta = -5,
            Reason = "Test adjustment"
        };
        var response = await client.PostAsJsonAsync("/api/inventory/adjust", adjustDto);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "adjusting down below reserved quantity must be rejected");
    }

    [Fact]
    public async Task TransferAcrossLocations_PreservesTotalQty()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);

        // Get two different locations (MAIN warehouse has at least 4).
        var allLocs = await SeedHelpers.GetAllMainLocationsAsync(_fixture.Factory);
        allLocs.Should().HaveCountGreaterThanOrEqualTo(2, "MAIN warehouse must have at least 2 locations");
        var locA = allLocs[0];
        var locB = allLocs[1];

        await SeedHelpers.ReceiveStockAsync(client, skuId, locA, 100);

        var transferDto = new TransferStockDto
        {
            SkuId = skuId,
            FromLocationId = locA,
            ToLocationId = locB,
            Quantity = 40
        };
        var transferResp = await client.PostAsJsonAsync("/api/inventory/transfer", transferDto);
        transferResp.StatusCode.Should().Be(HttpStatusCode.OK,
            "transferring within available qty should succeed");

        // Check both locations.
        var stockAll = await client.GetAsync($"/api/inventory/stock?skuId={skuId}");
        var items = (await stockAll.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockItemDto>>())
            .Data!.Items;

        var totalOnHand = items.Sum(i => i.QtyOnHand);
        totalOnHand.Should().Be(100, "total on-hand across all locations must be conserved after transfer");

        var locAItem = items.FirstOrDefault(i => i.LocationId == locA);
        var locBItem = items.FirstOrDefault(i => i.LocationId == locB);

        locAItem?.QtyOnHand.Should().Be(60, "location A should have 60 after transferring 40 out");
        locBItem?.QtyOnHand.Should().Be(40, "location B should have 40 after receiving 40");

        // Verify two movement rows exist.
        var movResp = await client.GetAsync(
            $"/api/inventory/movements?skuId={skuId}&type={Almajd.Domain.Enums.StockMovementType.Transfer}");
        var movements = (await movResp.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockMovementDto>>())
            .Data!.Items;

        movements.Should().HaveCount(1,
            "a transfer creates one movement row with both FromLocation and ToLocation set");
    }

    [Fact]
    public async Task Release_ReturnsReservedQty()
    {
        var (client, skuId, locationId) = await SetupAsync();

        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 20);

        // Reserve 6.
        var reserveDto = new ReserveStockDto { SkuId = skuId, LocationId = locationId, Quantity = 6 };
        (await client.PostAsJsonAsync("/api/inventory/reserve", reserveDto))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        // Release 6.
        var releaseDto = new ReserveStockDto { SkuId = skuId, LocationId = locationId, Quantity = 6 };
        var releaseResp = await client.PostAsJsonAsync("/api/inventory/release", releaseDto);
        releaseResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var stock = (await releaseResp.ReadApiResponseAsync<StockItemDto>()).Data!;
        stock.QtyReserved.Should().Be(0, "releasing 6 after reserving 6 should bring QtyReserved to 0");
        stock.QtyAvailable.Should().Be(20);
    }

    [Fact]
    public async Task ConfirmSale_DecrementsBothOnHandAndReserved_Atomically()
    {
        var (client, skuId, locationId) = await SetupAsync();

        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 10);

        // Reserve 6.
        var reserveDto = new ReserveStockDto { SkuId = skuId, LocationId = locationId, Quantity = 6 };
        (await client.PostAsJsonAsync("/api/inventory/reserve", reserveDto))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        // Confirm sale of 6.
        var confirmDto = new ConfirmSaleDto { SkuId = skuId, LocationId = locationId, Quantity = 6 };
        var confirmResp = await client.PostAsJsonAsync("/api/inventory/confirm-sale", confirmDto);
        confirmResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var stock = (await confirmResp.ReadApiResponseAsync<StockItemDto>()).Data!;
        stock.QtyOnHand.Should().Be(4, "QtyOnHand must decrease from 10 to 4 after confirming sale of 6");
        stock.QtyReserved.Should().Be(0, "QtyReserved must decrease from 6 to 0 after sale confirmation");

        // Verify Sell movement row.
        var movResp = await client.GetAsync(
            $"/api/inventory/movements?skuId={skuId}&type={Almajd.Domain.Enums.StockMovementType.Sell}");
        var movements = (await movResp.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockMovementDto>>())
            .Data!.Items;

        movements.Should().Contain(m => m.Type == Almajd.Domain.Enums.StockMovementType.Sell && m.Quantity == 6,
            "a Sell movement row of qty 6 must exist after confirm-sale");
    }
}
