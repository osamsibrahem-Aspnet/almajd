using System.Net;
using System.Net.Http.Json;
using Almajd.Application.DTOs.Inventory;
using Almajd.Domain.Enums;
using Almajd.IntegrationTests.Infrastructure;
using FluentAssertions;

namespace Almajd.IntegrationTests.Inventory;

/// <summary>
/// Tests for the inventory count (cycle count) workflow:
/// Create → Start → SetLines → Post.
/// Validates that variances generate adjustment movements and edge cases are gated correctly.
/// </summary>
[Collection("Almajd")]
public class CycleCountTests
{
    private readonly AlmajdFixture _fixture;

    public CycleCountTests(AlmajdFixture fixture)
    {
        _fixture = fixture;
    }

    private async Task<(HttpClient Client, Guid SkuId, Guid LocationId, Guid WarehouseId)> SetupAsync()
    {
        await _fixture.CleanMutableDataAsync();
        var client = await AuthHelpers.GetAdminClientAsync(_fixture.Factory);
        var brand = await SeedHelpers.CreateBrandAsync(client);
        var (_, skuId) = await SeedHelpers.CreateProductWithSkuAsync(client, brand.Id, _fixture.Factory);
        var locationId = await SeedHelpers.GetPickableLocationIdAsync(_fixture.Factory);
        var warehouseId = await SeedHelpers.GetMainWarehouseIdAsync(_fixture.Factory);
        return (client, skuId, locationId, warehouseId);
    }

    [Fact]
    public async Task CycleCount_WithVariance_PostsAdjustmentMovement()
    {
        var (client, skuId, locationId, warehouseId) = await SetupAsync();

        // System has 100 units.
        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 100);

        // Create count.
        var createDto = new CreateInventoryCountDto { WarehouseId = warehouseId, Notes = "Test count" };
        var createResp = await client.PostAsJsonAsync("/api/inventory/counts", createDto);
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var count = (await createResp.ReadApiResponseAsync<InventoryCountDto>()).Data!;
        count.Status.Should().Be(InventoryCountStatus.Draft);

        // Start the count.
        var startResp = await client.PostAsJsonAsync($"/api/inventory/counts/{count.Id}/start", new { });
        startResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Set lines: counted 95 (variance = -5).
        var lines = new List<CountLineInputDto>
        {
            new() { SkuId = skuId, LocationId = locationId, CountedQty = 95 }
        };
        var setLinesResp = await client.PutAsJsonAsync($"/api/inventory/counts/{count.Id}/lines", lines);
        setLinesResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var detail = (await setLinesResp.ReadApiResponseAsync<InventoryCountDetailDto>()).Data!;
        detail.Lines.Should().HaveCount(1);
        detail.Lines[0].SystemQty.Should().Be(100);
        detail.Lines[0].CountedQty.Should().Be(95);
        detail.Lines[0].Variance.Should().Be(-5);

        // Post.
        var postResp = await client.PostAsJsonAsync($"/api/inventory/counts/{count.Id}/post", new { });
        postResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var posted = (await postResp.ReadApiResponseAsync<InventoryCountDto>()).Data!;
        posted.Status.Should().Be(InventoryCountStatus.Posted);

        // Verify stock was adjusted.
        var stockResp = await client.GetAsync($"/api/inventory/stock?skuId={skuId}&locationId={locationId}");
        var stock = (await stockResp.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockItemDto>>())
            .Data!.Items.First();
        stock.QtyOnHand.Should().Be(95, "cycle count with -5 variance should reduce on-hand to 95");

        // Verify AdjustOut movement exists.
        var movResp = await client.GetAsync(
            $"/api/inventory/movements?skuId={skuId}&type={StockMovementType.AdjustOut}");
        var movements = (await movResp.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockMovementDto>>())
            .Data!.Items;

        movements.Should().Contain(m => m.Type == StockMovementType.AdjustOut && m.Quantity == 5,
            "an AdjustOut movement of qty 5 must be created for the -5 variance");
    }

    [Fact]
    public async Task CycleCount_WithNoVariance_PostsSuccessfully_NoMovements()
    {
        var (client, skuId, locationId, warehouseId) = await SetupAsync();

        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 50);

        var createResp = await client.PostAsJsonAsync("/api/inventory/counts",
            new CreateInventoryCountDto { WarehouseId = warehouseId });
        var count = (await createResp.ReadApiResponseAsync<InventoryCountDto>()).Data!;

        await client.PostAsJsonAsync($"/api/inventory/counts/{count.Id}/start", new { });

        var lines = new List<CountLineInputDto>
        {
            new() { SkuId = skuId, LocationId = locationId, CountedQty = 50 } // no variance
        };
        await client.PutAsJsonAsync($"/api/inventory/counts/{count.Id}/lines", lines);

        var before = DateTime.UtcNow;
        var postResp = await client.PostAsJsonAsync($"/api/inventory/counts/{count.Id}/post", new { });
        postResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // No adjustment movements should have been created.
        var movResp = await client.GetAsync(
            $"/api/inventory/movements?skuId={skuId}&from={Uri.EscapeDataString(before.AddSeconds(-1).ToString("o"))}&type={StockMovementType.AdjustOut}");
        var movements = (await movResp.ReadApiResponseAsync<Almajd.Application.Common.PagedResult<StockMovementDto>>())
            .Data!.Items;

        movements.Should().BeEmpty("no variance means no adjustment movements");
    }

    [Fact]
    public async Task PostCount_InDraftState_Returns400()
    {
        var (client, skuId, locationId, warehouseId) = await SetupAsync();

        var createResp = await client.PostAsJsonAsync("/api/inventory/counts",
            new CreateInventoryCountDto { WarehouseId = warehouseId });
        var count = (await createResp.ReadApiResponseAsync<InventoryCountDto>()).Data!;

        // Attempt to post without starting.
        var postResp = await client.PostAsJsonAsync($"/api/inventory/counts/{count.Id}/post", new { });
        postResp.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "posting a Draft count should fail — must be InProgress first");
    }

    [Fact]
    public async Task SetLines_OnPostedCount_Returns400()
    {
        var (client, skuId, locationId, warehouseId) = await SetupAsync();

        await SeedHelpers.ReceiveStockAsync(client, skuId, locationId, 10);

        var createResp = await client.PostAsJsonAsync("/api/inventory/counts",
            new CreateInventoryCountDto { WarehouseId = warehouseId });
        var count = (await createResp.ReadApiResponseAsync<InventoryCountDto>()).Data!;

        await client.PostAsJsonAsync($"/api/inventory/counts/{count.Id}/start", new { });

        var lines = new List<CountLineInputDto>
        {
            new() { SkuId = skuId, LocationId = locationId, CountedQty = 10 }
        };
        await client.PutAsJsonAsync($"/api/inventory/counts/{count.Id}/lines", lines);
        await client.PostAsJsonAsync($"/api/inventory/counts/{count.Id}/post", new { });

        // Attempt to modify lines after posting.
        var editResp = await client.PutAsJsonAsync($"/api/inventory/counts/{count.Id}/lines", lines);
        editResp.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "editing lines on a Posted count must be rejected");
    }
}
