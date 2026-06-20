namespace Almajd.Domain.Constants;

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string SalesRep = "SalesRep";
    public const string WarehouseOperator = "WarehouseOperator";
    public const string WarehouseManager = "WarehouseManager";
    public const string Procurement = "Procurement";
    public const string Accountant = "Accountant";
    public const string OpsManager = "OpsManager";
    public const string Customer = "Customer";

    public static readonly IReadOnlyList<string> All = new[]
    {
        Admin, SalesRep, WarehouseOperator, WarehouseManager,
        Procurement, Accountant, OpsManager, Customer
    };
}
