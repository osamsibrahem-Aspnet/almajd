using System.Text;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Infrastructure.Auth;
using Almajd.Infrastructure.BackgroundJobs;
using Almajd.Infrastructure.Billing;
using Almajd.Infrastructure.Email;
using Almajd.Infrastructure.Files;
using Almajd.Infrastructure.Notifications;
using Almajd.Infrastructure.Pdf;
using Almajd.Infrastructure.Persistence;
using Almajd.Infrastructure.Persistence.Repositories;
using Almajd.Infrastructure.Sms;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Almajd.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Persistence
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Cross-cutting
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IFileOperations, FileOperations>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IEmailSender, MailKitEmailSender>();
        services.AddScoped<ISmsSender, LoggingSmsSender>();

        // Billing infrastructure
        services.AddScoped<IInvoiceNumberGenerator, SqlServerInvoiceNumberGenerator>();
        services.AddSingleton<IInvoicePdfGenerator, InvoicePdfGenerator>();

        // Notification channels (multiple registrations — INotificationService receives IEnumerable<INotificationChannel>)
        services.AddScoped<INotificationChannel, EmailNotificationChannel>();
        services.AddScoped<INotificationChannel, PushNotificationChannel>();
        services.AddScoped<INotificationChannel, SmsNotificationChannel>();
        services.AddScoped<INotificationChannel, InAppNotificationChannel>();

        // Background jobs
        services.AddHostedService<LowStockAlertHostedService>();
        services.AddHostedService<DunningHostedService>();
        services.AddHostedService<LateOrderDetectorHostedService>();

        // Identity
        services
            .AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 8;

                options.User.RequireUniqueEmail = true;
                options.SignIn.RequireConfirmedEmail = false; // flip to true once email pipeline is wired

                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Lockout.MaxFailedAccessAttempts = 5;
            })
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        // JWT bearer
        var jwtKey = configuration["JWT:Key"]
            ?? throw new InvalidOperationException("JWT:Key is not configured.");

        services
            .AddAuthentication(opt =>
            {
                opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(opt =>
            {
                opt.SaveToken = true;
                opt.RequireHttpsMetadata = false;
                opt.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["JWT:Issuer"],
                    ValidAudience = configuration["JWT:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ClockSkew = TimeSpan.Zero
                };
            });

        return services;
    }
}
