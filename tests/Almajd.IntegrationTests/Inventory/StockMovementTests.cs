using System.Net;
using Almajd.Application.DTOs.Inventory;
using Almajd.IntegrationTests.Infrastructure;
using FluentAssertions;

namespace Almajd.IntegrationTests.Inventory;

/// <summary>
/// Tests for stock movement queries: pagination and filtering by SKU and date range.
/// Also confirms movements are append-only (no update/delete endpoints exposed).
/// </summary>
[Collection("Almajd")]
public class StockMovementTests
{
    private readonly AlmajdFixture _fixture;

    public StockMovementTests(AlmajdFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Movements_AreAppendOnly_NoUpdateOrDeleteEndpointExposed()
    {
        // Verify the inventory controller does not expose PUT or DELETE for /movements.
        // This is a contract test — if someone adds a destructive endpoint, this test breaks.
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);

        // PUT /api/inventory/movements should 404 or 405, never 200.
        var putResp = await client.PutAsJsonAsync("/api/inventory/movements", new { });
        putResp.StatusCode.Should().BeOneOf(
            HttpStatusCode.NotFound,
            HttpStatusCode.MethodNotAllowed,
            HttpStatusCode.UnsupportedMediaType);

        // DELETE /api/inventory/movements should also fail.
        var deleteResp = await client.DeleteAsync("/api/inventory/movements");
        deleteResp.StatusCode.Should().BeOneOf(
            HttpStatusCode.NotFound,
            HttpStatusCode.MethodNotAllowed);
    }

    [Fact]
    public async Task SearchMovements_BySkuId_ReturnsOnlyThatSkusMovements()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuA) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var (_, skuB) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        await SeedHelpers.ReceiveStockAsync(client, skuA, locationId, 50);
        await SeedHelpers.ReceiveStockAsync(client, skuB, locationId, 30);

        var resp = await client.GetAsync($"/api/inventory/movements?skuId={skuA}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var movements = (await resp.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockMovementDto>>())
            .Data!.Items;

        movements.Should().AllSatisfy(m => m.SkuId.Should().Be(skuA),
            "filtering by skuId must return only movements for that SKU");
        movements.Should().NotBeEmpty();
    }

    [Fact]
    public async Task SearchMovements_ByDateRange_FiltersCorrectly()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        var before = DateTime.UtcNow;
        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 10);
        var after = DateTime.UtcNow;

        // Query with date range that should include the movement.
        var fromParam = Uri.EscapeDataString(before.AddSeconds(-1).ToString("o"));
        var toParam = Uri.EscapeDataString(after.AddSeconds(1).ToString("o"));

        var resp = await client.GetAsync(
            $"/api/inventory/movements?skuId={skuId}&from={fromParam}&to={toParam}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var movements = (await resp.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockMovementDto>>())
            .Data!.Items;

        movements.Should().HaveCount(1, "only the one receive movement should be in the date range");
        movements[0].Quantity.Should().Be(10);
    }

    [Fact]
    public async Task SearchMovements_Paginated_ReturnsCorrectPage()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);

        // Generate 5 movements.
        for (var i = 0; i < 5; i++)
            await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 1);

        // Page 1, pageSize 2.
        var resp1 = await client.GetAsync($"/api/inventory/movements?skuId={skuId}&page=1&pageSize=2");
        var page1 = (await resp1.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockMovementDto>>()).Data!;
        page1.Items.Should().HaveCount(2);
        page1.Total.Should().Be(5);

        // Page 2, pageSize 2.
        var resp2 = await client.GetAsync($"/api/inventory/movements?skuId={skuId}&page=2&pageSize=2");
        var page2 = (await resp2.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockMovementDto>>()).Data!;
        page2.Items.Should().HaveCount(2);

        // Pages should not overlap.
        var ids1 = page1.Items.Select(m => m.Id).ToHashSet();
        var ids2 = page2.Items.Select(m => m.Id).ToHashSet();
        ids1.Intersect(ids2).Should().BeEmpty("different pages must not return duplicate records");
    }
}
