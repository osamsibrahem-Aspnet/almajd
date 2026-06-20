using Almajd.Application.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace Almajd.Api.Extensions;

public static class ModelStateValidationExtension
{
    public static IServiceCollection AddModelStateValidationErrorsHandling(this IServiceCollection services)
    {
        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = actionContext =>
            {
                var errors = actionContext.ModelState
                    .Where(e => e.Value?.Errors.Count > 0)
                    .SelectMany(e => e.Value!.Errors.Select(err => err.ErrorMessage))
                    .ToList();

                var response = ApiResponse.Fail(400, "Validation failed.", errors);
                return new BadRequestObjectResult(response);
            };
        });

        return services;
    }
}
