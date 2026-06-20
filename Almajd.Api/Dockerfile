FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

COPY ["Almajd.Api/Almajd.Api.csproj", "Almajd.Api/"]
COPY ["Almajd.Application/Almajd.Application.csproj", "Almajd.Application/"]
COPY ["Almajd.Infrastructure/Almajd.Infrastructure.csproj", "Almajd.Infrastructure/"]
COPY ["Almajd.Domain/Almajd.Domain.csproj", "Almajd.Domain/"]
RUN dotnet restore "Almajd.Api/Almajd.Api.csproj"

COPY . .
WORKDIR "/src/Almajd.Api"
RUN dotnet build "Almajd.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "Almajd.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

ENTRYPOINT ["dotnet", "Almajd.Api.dll"]
