using Almajd.Domain.Constants;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using Almajd.Infrastructure.Persistence;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Almajd.Infrastructure.Seeding;

public static class DbInitializer
{
    public static async Task SeedingDataAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("Almajd.DbInitializer");

        try
        {
            var db = services.GetRequiredService<ApplicationDbContext>();
            await db.Database.MigrateAsync();

            var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            foreach (var role in AppRoles.All)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole<Guid>(role));
            }

            var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
            var config = services.GetRequiredService<IConfiguration>();

            var adminEmail = config["DefaultAdmin:Email"] ?? "admin@almajd.local";
            var adminPassword = config["DefaultAdmin:Password"] ?? "Admin@12345";

            var admin = await userManager.FindByEmailAsync(adminEmail);
            if (admin is null)
            {
                admin = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    EmailConfirmed = true,
                    FullName = "System Administrator"
                };

                var result = await userManager.CreateAsync(admin, adminPassword);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(admin, AppRoles.Admin);
                    logger.LogInformation("Seeded default admin user {Email}.", adminEmail);
                }
                else
                {
                    logger.LogError("Failed to seed default admin: {Errors}",
                        string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }

            if (!await db.Warehouses.AnyAsync())
            {
                var main = new Warehouse
                {
                    Code = "MAIN",
                    Name = "Main Warehouse",
                    IsActive = true
                };

                main.Locations.Add(new Location { Zone = "A", Aisle = "1", Shelf = "1", Bin = "A", IsPickable = true });
                main.Locations.Add(new Location { Zone = "A", Aisle = "1", Shelf = "1", Bin = "B", IsPickable = true });
                main.Locations.Add(new Location { Zone = "RECV", Aisle = "0", Shelf = "0", Bin = "0", IsPickable = false });
                main.Locations.Add(new Location { Zone = "DMG", Aisle = "0", Shelf = "0", Bin = "0", IsPickable = false });

                db.Warehouses.Add(main);
                await db.SaveChangesAsync();
                logger.LogInformation("Seeded default warehouse MAIN with starter locations.");
            }

            if (!await db.PriceLists.AnyAsync())
            {
                db.PriceLists.Add(new PriceList
                {
                    Name = "Default",
                    Currency = "EGP",
                    IsDefault = true,
                    IsActive = true
                });
                await db.SaveChangesAsync();
                logger.LogInformation("Seeded default price list 'Default' (EGP).");
            }

            var currentYear = DateTime.UtcNow.Year;
            if (!await db.InvoiceCounters.AnyAsync(c => c.Year == currentYear))
            {
                db.InvoiceCounters.Add(new InvoiceCounter { Year = currentYear, NextSequence = 1 });
                await db.SaveChangesAsync();
                logger.LogInformation("Seeded invoice counter for year {Year}.", currentYear);
            }

            if (!await db.NotificationTemplates.AnyAsync())
            {
                db.NotificationTemplates.AddRange(
                    new NotificationTemplate
                    {
                        Code = "ORDER_APPROVED",
                        Category = NotificationCategory.OrderStateChange,
                        Title = "Your order {{OrderNumber}} is approved",
                        Body = "Hello {{CustomerName}}, your order {{OrderNumber}} for {{Total}} {{Currency}} has been approved and stock is reserved."
                    },
                    new NotificationTemplate
                    {
                        Code = "ORDER_SHIPPED",
                        Category = NotificationCategory.OrderStateChange,
                        Title = "Your order {{OrderNumber}} has shipped",
                        Body = "Order {{OrderNumber}} is on its way. Driver: {{DriverName}}. Waybill: {{Waybill}}."
                    },
                    new NotificationTemplate
                    {
                        Code = "ORDER_DELIVERED",
                        Category = NotificationCategory.OrderStateChange,
                        Title = "Order {{OrderNumber}} delivered",
                        Body = "Order {{OrderNumber}} was delivered on {{DeliveredAt}}. An invoice will follow shortly."
                    },
                    new NotificationTemplate
                    {
                        Code = "ORDER_LATE",
                        Category = NotificationCategory.OrderStateChange,
                        Title = "Order {{OrderNumber}} is late",
                        Body = "Order {{OrderNumber}} for {{CustomerName}} is {{HoursLate}}h past its expected ship time. Current status: {{Status}}."
                    },
                    new NotificationTemplate
                    {
                        Code = "LOW_STOCK",
                        Category = NotificationCategory.LowStock,
                        Title = "Low stock alert: {{ProductName}}",
                        Body = "{{ProductName}} ({{SkuCode}}) is below reorder point. Available: {{Available}} / Reorder at: {{ReorderPoint}}."
                    },
                    new NotificationTemplate
                    {
                        Code = "INVOICE_ISSUED",
                        Category = NotificationCategory.Billing,
                        Title = "Invoice {{InvoiceNumber}} issued",
                        Body = "Invoice {{InvoiceNumber}} for {{Total}} {{Currency}} has been issued to {{CustomerName}}. Due {{DueDate}}."
                    },
                    new NotificationTemplate
                    {
                        Code = "INVOICE_OVERDUE",
                        Category = NotificationCategory.Billing,
                        Title = "Invoice {{InvoiceNumber}} is {{DaysOverdue}} days overdue",
                        Body = "Invoice {{InvoiceNumber}} ({{Outstanding}} {{Currency}}) for {{CustomerName}} was due {{DueDate}} and is now {{DaysOverdue}} days overdue."
                    });

                await db.SaveChangesAsync();
                logger.LogInformation("Seeded {Count} notification templates.", 7);
            }

            // -----------------------------------------------------------------------
            // DEMO DATA — added blocks below; existing blocks above are untouched
            // -----------------------------------------------------------------------

            // Block 1 — Staff users (one per non-Admin role)
            await SeedStaffUsersAsync(userManager, logger);

            // Block 2 — Brands
            await SeedBrandsAsync(db, logger);

            // Block 3 — Categories
            await SeedCategoriesAsync(db, logger);

            // Block 4 — Products + SKUs
            await SeedProductsAndSkusAsync(db, logger);

            // Block 5 — Suppliers
            await SeedSuppliersAsync(db, logger);

            // Block 6 — SupplierSkus
            await SeedSupplierSkusAsync(db, logger);

            // Block 7 — Customers
            await SeedCustomersAsync(db, logger);

            // Block 8 — Stock items
            await SeedStockItemsAsync(db, logger);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database seeding failed.");
            throw;
        }
    }

    // -----------------------------------------------------------------------
    // Block 1: Staff users
    // -----------------------------------------------------------------------
    private static async Task SeedStaffUsersAsync(
        UserManager<ApplicationUser> userManager,
        ILogger logger)
    {
        const string password = "Test@12345";

        var staff = new[]
        {
            (Email: "salesrep@almajd.test",          FullName: "Sara Sales",           Role: AppRoles.SalesRep),
            (Email: "warehouseoperator@almajd.test", FullName: "Walid Warehouse Op",   Role: AppRoles.WarehouseOperator),
            (Email: "warehousemanager@almajd.test",  FullName: "Wael Warehouse Mgr",   Role: AppRoles.WarehouseManager),
            (Email: "procurement@almajd.test",       FullName: "Pamela Procurement",   Role: AppRoles.Procurement),
            (Email: "accountant@almajd.test",        FullName: "Adam Accountant",      Role: AppRoles.Accountant),
            (Email: "opsmanager@almajd.test",        FullName: "Olivia OpsManager",    Role: AppRoles.OpsManager),
            (Email: "customer@almajd.test",          FullName: "Charlie Customer",     Role: AppRoles.Customer),
        };

        foreach (var (email, fullName, role) in staff)
        {
            if (await userManager.FindByEmailAsync(email) is not null)
                continue;

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                FullName = fullName
            };

            var result = await userManager.CreateAsync(user, password);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, role);
                logger.LogInformation("Seeded staff user {Email} with role {Role}.", email, role);
            }
            else
            {
                logger.LogWarning("Failed to seed staff user {Email}: {Errors}",
                    email, string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }

    // -----------------------------------------------------------------------
    // Block 2: Brands
    // -----------------------------------------------------------------------
    private static async Task SeedBrandsAsync(ApplicationDbContext db, ILogger logger)
    {
        if (await db.Brands.AnyAsync())
            return;

        db.Brands.AddRange(
            new Brand { Name = "Anker",   Slug = "anker",   IsActive = true },
            new Brand { Name = "Apple",   Slug = "apple",   IsActive = true },
            new Brand { Name = "Samsung", Slug = "samsung", IsActive = true }
        );

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded 3 brands: Anker, Apple, Samsung.");
    }

    // -----------------------------------------------------------------------
    // Block 3: Categories
    // -----------------------------------------------------------------------
    private static async Task SeedCategoriesAsync(ApplicationDbContext db, ILogger logger)
    {
        if (await db.Categories.AnyAsync())
            return;

        // Root categories
        var chargers = new Category { Name = "Chargers",  Slug = "chargers",  SortOrder = 1, IsActive = true };
        var cables   = new Category { Name = "Cables",    Slug = "cables",    SortOrder = 2, IsActive = true };
        var cases    = new Category { Name = "Cases",     Slug = "cases",     SortOrder = 3, IsActive = true };
        var audio    = new Category { Name = "Audio",     Slug = "audio",     SortOrder = 4, IsActive = true };

        db.Categories.AddRange(chargers, cables, cases, audio);
        await db.SaveChangesAsync();

        // Children under Chargers
        db.Categories.AddRange(
            new Category { Name = "Wall Chargers",     Slug = "wall-chargers",     ParentId = chargers.Id, SortOrder = 1, IsActive = true },
            new Category { Name = "Car Chargers",      Slug = "car-chargers",      ParentId = chargers.Id, SortOrder = 2, IsActive = true },
            new Category { Name = "Wireless Chargers", Slug = "wireless-chargers", ParentId = chargers.Id, SortOrder = 3, IsActive = true }
        );

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded 4 root categories and 3 sub-categories under Chargers.");
    }

    // -----------------------------------------------------------------------
    // Block 4: Products + SKUs
    // -----------------------------------------------------------------------
    private static async Task SeedProductsAndSkusAsync(ApplicationDbContext db, ILogger logger)
    {
        if (await db.Products.AnyAsync())
            return;

        var anker  = await db.Brands.FirstAsync(b => b.Slug == "anker");
        var apple  = await db.Brands.FirstAsync(b => b.Slug == "apple");
        var samsung = await db.Brands.FirstAsync(b => b.Slug == "samsung");

        var wallChargers = await db.Categories.FirstAsync(c => c.Slug == "wall-chargers");
        var cables       = await db.Categories.FirstAsync(c => c.Slug == "cables");

        // --- Anker PowerPort III 65W ---
        var ankerPP3 = new Product
        {
            BrandId    = anker.Id,
            CategoryId = wallChargers.Id,
            Name       = "Anker PowerPort III 65W",
            Slug       = "anker-powerport-iii-65w",
            Description = "65W GaN fast charger, 3-port, foldable plug.",
            Status     = ProductStatus.Published,
            IsFeatured = true
        };
        ankerPP3.Skus.Add(new Sku
        {
            Code    = "ANK-PP3-65W-BLK",
            Barcode = "0194644000001",
            AttributesJson = "{\"color\":\"Black\",\"wattage\":65}",
            IsActive = true,
            ReorderPoint = 10,
            ReorderQty   = 30
        });
        ankerPP3.Skus.Add(new Sku
        {
            Code    = "ANK-PP3-65W-WHT",
            Barcode = "0194644000002",
            AttributesJson = "{\"color\":\"White\",\"wattage\":65}",
            IsActive = true,
            ReorderPoint = 10,
            ReorderQty   = 30
        });
        db.Products.Add(ankerPP3);

        // --- Anker PowerLine III USB-C ---
        var ankerPL3 = new Product
        {
            BrandId    = anker.Id,
            CategoryId = cables.Id,
            Name       = "Anker PowerLine III USB-C",
            Slug       = "anker-powerline-iii-usbc",
            Description = "USB-C to USB-C braided cable, Duraline Core.",
            Status     = ProductStatus.Published,
            IsFeatured = true
        };
        ankerPL3.Skus.Add(new Sku
        {
            Code    = "ANK-PL3-1M-BLK",
            Barcode = "0194644000003",
            AttributesJson = "{\"color\":\"Black\",\"length_m\":1}",
            IsActive = true,
            ReorderPoint = 15,
            ReorderQty   = 50
        });
        ankerPL3.Skus.Add(new Sku
        {
            Code    = "ANK-PL3-2M-BLK",
            Barcode = "0194644000004",
            AttributesJson = "{\"color\":\"Black\",\"length_m\":2}",
            IsActive = true,
            ReorderPoint = 10,
            ReorderQty   = 30
        });
        db.Products.Add(ankerPL3);

        // --- Apple 20W USB-C Charger ---
        var apple20W = new Product
        {
            BrandId    = apple.Id,
            CategoryId = wallChargers.Id,
            Name       = "Apple 20W USB-C Power Adapter",
            Slug       = "apple-20w-usbc-power-adapter",
            Description = "Original Apple 20W USB-C wall charger.",
            Status     = ProductStatus.Published,
            IsFeatured = true
        };
        apple20W.Skus.Add(new Sku
        {
            Code    = "APL-20W-001",
            Barcode = "0194644000005",
            AttributesJson = "{\"wattage\":20,\"connector\":\"USB-C\"}",
            IsActive = true,
            ReorderPoint = 10,
            ReorderQty   = 20
        });
        db.Products.Add(apple20W);

        // --- Apple Lightning Cable 1m ---
        var appleLtg = new Product
        {
            BrandId    = apple.Id,
            CategoryId = cables.Id,
            Name       = "Apple Lightning to USB-A Cable 1m",
            Slug       = "apple-lightning-usba-cable-1m",
            Description = "Original Apple Lightning cable, 1 metre.",
            Status     = ProductStatus.Published,
            IsFeatured = false
        };
        appleLtg.Skus.Add(new Sku
        {
            Code    = "APL-LTG-1M",
            Barcode = "0194644000006",
            AttributesJson = "{\"connector\":\"Lightning\",\"length_m\":1}",
            IsActive = true,
            ReorderPoint = 10,
            ReorderQty   = 30
        });
        db.Products.Add(appleLtg);

        // --- Samsung 25W Super Fast Charger ---
        var sam25W = new Product
        {
            BrandId    = samsung.Id,
            CategoryId = wallChargers.Id,
            Name       = "Samsung 25W Super Fast Charger",
            Slug       = "samsung-25w-super-fast-charger",
            Description = "25W USB-C Super Fast Charging wall adapter.",
            Status     = ProductStatus.Published,
            IsFeatured = false
        };
        sam25W.Skus.Add(new Sku
        {
            Code    = "SAM-25W-001",
            Barcode = "0194644000007",
            AttributesJson = "{\"wattage\":25,\"connector\":\"USB-C\"}",
            IsActive = true,
            ReorderPoint = 8,
            ReorderQty   = 20
        });
        db.Products.Add(sam25W);

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded 5 products with 7 SKUs total.");
    }

    // -----------------------------------------------------------------------
    // Block 5: Suppliers
    // -----------------------------------------------------------------------
    private static async Task SeedSuppliersAsync(ApplicationDbContext db, ILogger logger)
    {
        if (await db.Suppliers.AnyAsync())
            return;

        db.Suppliers.AddRange(
            new Supplier
            {
                Code                = "APL-DIST-EG",
                Name                = "Apple Distribution Egypt",
                Currency            = "EGP",
                PaymentTermsNetDays = 30,
                IsActive            = true
            },
            new Supplier
            {
                Code                = "ANK-DIST-EG",
                Name                = "Anker Distribution Egypt",
                Currency            = "EGP",
                PaymentTermsNetDays = 30,
                IsActive            = true
            }
        );

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded 2 suppliers: Apple Distribution Egypt, Anker Distribution Egypt.");
    }

    // -----------------------------------------------------------------------
    // Block 6: SupplierSkus
    // -----------------------------------------------------------------------
    private static async Task SeedSupplierSkusAsync(ApplicationDbContext db, ILogger logger)
    {
        if (await db.SupplierSkus.AnyAsync())
            return;

        var appleSupplier = await db.Suppliers.FirstAsync(s => s.Code == "APL-DIST-EG");
        var ankerSupplier = await db.Suppliers.FirstAsync(s => s.Code == "ANK-DIST-EG");

        // Apple SKUs
        var appleCodes = new[] { "APL-20W-001", "APL-LTG-1M" };
        var appleSkus  = await db.Skus.Where(s => appleCodes.Contains(s.Code)).ToListAsync();
        foreach (var sku in appleSkus)
        {
            var costPrice = sku.Code == "APL-20W-001" ? 1800m : 250m;
            db.SupplierSkus.Add(new SupplierSku
            {
                SupplierId      = appleSupplier.Id,
                SkuId           = sku.Id,
                SupplierSkuCode = sku.Code,
                LeadTimeDays    = 7,
                CostPrice       = costPrice,
                Currency        = "EGP",
                IsPreferred     = true
            });
        }

        // Anker SKUs
        var ankerCodes = new[] { "ANK-PP3-65W-BLK", "ANK-PP3-65W-WHT", "ANK-PL3-1M-BLK", "ANK-PL3-2M-BLK" };
        var ankerSkus  = await db.Skus.Where(s => ankerCodes.Contains(s.Code)).ToListAsync();
        foreach (var sku in ankerSkus)
        {
            var costPrice = sku.Code.StartsWith("ANK-PP3") ? 1400m : 120m;
            db.SupplierSkus.Add(new SupplierSku
            {
                SupplierId      = ankerSupplier.Id,
                SkuId           = sku.Id,
                SupplierSkuCode = sku.Code,
                LeadTimeDays    = 7,
                CostPrice       = costPrice,
                Currency        = "EGP",
                IsPreferred     = true
            });
        }

        // Samsung SKU (SAM-25W-001) intentionally left without a supplier — test case.

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded SupplierSku links for Apple and Anker SKUs (Samsung left unlinked).");
    }

    // -----------------------------------------------------------------------
    // Block 7: Customers
    // -----------------------------------------------------------------------
    private static async Task SeedCustomersAsync(ApplicationDbContext db, ILogger logger)
    {
        if (await db.Customers.AnyAsync())
            return;

        db.Customers.AddRange(
            new Customer
            {
                Code                = "CUST-001",
                LegalName           = "Cairo Electronics Shop",
                Tier                = CustomerTier.Mid,
                Status              = CustomerStatus.Active,
                PaymentTermsNetDays = 30,
                CreditLimit         = 50_000m
            },
            new Customer
            {
                Code                = "CUST-002",
                LegalName           = "Alex Mobile Hub",
                Tier                = CustomerTier.Vip,
                Status              = CustomerStatus.Active,
                PaymentTermsNetDays = 30,
                CreditLimit         = 100_000m
            },
            new Customer
            {
                Code                = "CUST-003",
                LegalName           = "Mansoura Phone Center",
                Tier                = CustomerTier.Small,
                Status              = CustomerStatus.FollowUp,
                PaymentTermsNetDays = 0,
                CreditLimit         = 10_000m
            }
        );

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded 3 customers.");
    }

    // -----------------------------------------------------------------------
    // Block 8: Stock items (initial inventory at MAIN / A-1-1-A)
    // -----------------------------------------------------------------------
    private static async Task SeedStockItemsAsync(ApplicationDbContext db, ILogger logger)
    {
        if (await db.StockItems.AnyAsync())
            return;

        // Find the MAIN warehouse's A-1-1-A location
        var location = await db.Locations
            .Where(l => l.Zone == "A" && l.Aisle == "1" && l.Shelf == "1" && l.Bin == "A")
            .FirstOrDefaultAsync();

        if (location is null)
        {
            logger.LogWarning("Seed StockItems skipped — location A-1-1-A not found in MAIN warehouse.");
            return;
        }

        var skus = await db.Skus.ToListAsync();
        if (!skus.Any())
        {
            logger.LogWarning("Seed StockItems skipped — no SKUs found.");
            return;
        }

        // Vary quantities to look realistic
        var quantities = new Dictionary<string, int>
        {
            ["ANK-PP3-65W-BLK"] = 60,
            ["ANK-PP3-65W-WHT"] = 40,
            ["ANK-PL3-1M-BLK"]  = 100,
            ["ANK-PL3-2M-BLK"]  = 80,
            ["APL-20W-001"]     = 50,
            ["APL-LTG-1M"]      = 75,
            ["SAM-25W-001"]     = 35,
        };

        foreach (var sku in skus)
        {
            var qty = quantities.TryGetValue(sku.Code, out var q) ? q : 50;
            db.StockItems.Add(new StockItem
            {
                SkuId        = sku.Id,
                LocationId   = location.Id,
                QtyOnHand    = qty,
                QtyReserved  = 0
            });
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} stock item records at MAIN/A-1-1-A.", skus.Count);
    }
}
