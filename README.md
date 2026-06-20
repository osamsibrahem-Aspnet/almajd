# Almajd — B2B Commerce + ERP

B2B wholesale platform for mobile-phone accessories. Combines a customer-facing ordering app with an admin ERP that runs the inventory → order → fulfilment → invoicing → payment loop.

- **Backend:** ASP.NET Core 8 · Clean Architecture (Api / Application / Domain / Infrastructure)
- **Frontend (admin):** Angular 17 · Bootstrap 5
- **Frontend (B2B app):** Flutter
- **Database:** SQL Server 2022 (Docker)
- **Specs:** `../SPEC.md`, `../IMPLEMENTATION_PLAN.md`, `../ARCHITECTURE.md`

## Repository layout

```
Almajd/
├── Almajd.sln
├── docker-compose.yml         ← SQL Server 2022 on port 1434 (so it can coexist with LMS on 1433)
├── .env.example               ← copy to .env to override SA_PASSWORD
├── Almajd.Api/                ← ASP.NET Core Web API + Dockerfile
├── Almajd.Application/        ← Services, DTOs, interfaces (Clean Architecture core)
├── Almajd.Domain/             ← Entities, enums, constants
└── Almajd.Infrastructure/     ← EF Core, Identity, EF migrations, file/email/SMS/PDF
```

## Run it locally

### 1. Start the database

```bash
cp .env.example .env       # optional — to override SA_PASSWORD
docker compose up -d
```

### 2. Configure dev secrets (one-time)

```bash
cd Almajd.Api
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Server=localhost,1434;Database=Almajd;User Id=sa;Password=Almajd@2026!Dev;TrustServerCertificate=True;Encrypt=False"
dotnet user-secrets set "JWT:Key" "$(openssl rand -base64 48)"
dotnet user-secrets set "DefaultAdmin:Password" "Admin@12345"
```

### 3. Apply migrations

```bash
dotnet ef database update --project Almajd.Infrastructure --startup-project Almajd.Api
```

### 4. Run the API

```bash
ASPNETCORE_ENVIRONMENT=Development dotnet run --project Almajd.Api --urls "http://localhost:5100"
```

Swagger: <http://localhost:5100/swagger> · Health: <http://localhost:5100/api/health>

First run seeds roles (Admin, SalesRep, WarehouseOperator, WarehouseManager, Procurement, Accountant, OpsManager, Customer), a default admin user (`admin@almajd.local`), a default warehouse "Main", and a default price list.

## Useful commands

```bash
# Build
dotnet build Almajd.sln

# Run tests (when added)
dotnet test

# Add migration
dotnet ef migrations add <Name> --project Almajd.Infrastructure --startup-project Almajd.Api

# Apply migrations
dotnet ef database update --project Almajd.Infrastructure --startup-project Almajd.Api

# Drop database
dotnet ef database drop --project Almajd.Infrastructure --startup-project Almajd.Api
```

## Conventions

See `../ARCHITECTURE.md`. Highlights:

- All entities inherit `BaseEntity` (`Guid Id`, `CreatedAt`, `UpdatedAt`, `IsDeleted`).
- Soft delete via global query filter; never call `Remove()` — use `IGenericRepository<T>.SoftDelete`.
- All API responses wrapped in `ApiResponse<T>`.
- Services depend on `IUnitOfWork`, never on `ApplicationDbContext`.
- Enums stored as strings (`HasConversion<string>()`).
- Background work via `IHostedService`.
- File uploads through `IFileOperations`.
# almajd
