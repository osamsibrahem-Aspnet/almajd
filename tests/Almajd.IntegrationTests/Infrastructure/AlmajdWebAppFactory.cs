using Almajd.Application.Interfaces;
using Almajd.Infrastructure.Persistence;
using DotNet.Testcontainers.Builders;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NSubstitute;
using Testcontainers.MsSql;

namespace Almajd.IntegrationTests.Infrastructure;

/// <summary>
/// WebApplicationFactory that spins up a real SQL Server container via Testcontainers,
/// overrides the connection string, replaces outbound channels (email/SMS) with no-op stubs,
/// and registers a permissive rate-limiter policy so the auth endpoints don't blow up in tests.
/// One instance per collection — shared across all tests in the collection fixture.
///
/// The SQL Server 2022 non-root image moved sqlcmd to /opt/mssql-tools18/bin/sqlcmd.
/// Testcontainers 3.x uses the old path and loops forever. We override to TCP-port wait.
/// </summary>
public class AlmajdWebAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MsSqlContainer _msSql = new MsSqlBuilder()
        .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
        .WithPassword("Test@12345!Almajd")
        // SQL Server 2022 (non-root) moves sqlcmd to /opt/mssql-tools18/bin/sqlcmd.
        // Override the Testcontainers default health check (which probes the old path) with a
        // simple TCP-port wait. SQL Server listens on 1433 as soon as it's ready for connections.
        .WithWaitStrategy(Wait.ForUnixContainer().UntilPortIsAvailable(MsSqlBuilder.MsSqlPort))
        .Build();

    public async Task InitializeAsync()
    {
        await _msSql.StartAsync();
    }

    public new async Task DisposeAsync()
    {
        await _msSql.DisposeAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:DefaultConnection", _msSql.GetConnectionString());
        builder.UseSetting("JWT:Key", "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff");
        builder.UseSetting("JWT:Issuer", "test");
        builder.UseSetting("JWT:Audience", "test");
        builder.UseSetting("DefaultAdmin:Email", "admin@almajd.local");
        builder.UseSetting("DefaultAdmin:Password", "Admin@12345");
        builder.UseSetting("Otp:HashKey", "test-otp-hash-key-32chars-padding!!");
        builder.UseSetting("Otp:CodeLength", "6");
        builder.UseSetting("Otp:ExpiryMinutes", "5");
        builder.UseSetting("Otp:MaxAttempts", "5");

        builder.ConfigureServices(services =>
        {
            // Replace IEmailSender with a no-op stub.
            services.RemoveAll<IEmailSender>();
            var emailStub = Substitute.For<IEmailSender>();
            services.AddScoped(_ => emailStub);

            // Replace ISmsSender with a no-op stub.
            services.RemoveAll<ISmsSender>();
            var smsStub = Substitute.For<ISmsSender>();
            services.AddScoped(_ => smsStub);

            // Note: AuthController uses [EnableRateLimiting("auth")] but Program.cs never calls
            // app.UseRateLimiter(), so the attribute is a no-op at runtime and needs no test override.
        });

        builder.UseEnvironment("Development"); // Use Development so ExceptionMiddleware exposes error details in tests
    }
}
