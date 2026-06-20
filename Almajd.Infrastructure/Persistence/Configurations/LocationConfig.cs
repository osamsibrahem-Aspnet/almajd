using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class LocationConfig : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.Property(l => l.Zone).IsRequired().HasMaxLength(16);
        builder.Property(l => l.Aisle).IsRequired().HasMaxLength(16);
        builder.Property(l => l.Shelf).IsRequired().HasMaxLength(16);
        builder.Property(l => l.Bin).IsRequired().HasMaxLength(16);

        builder.Ignore(l => l.Address); // computed property

        builder.HasIndex(l => new { l.WarehouseId, l.Zone, l.Aisle, l.Shelf, l.Bin }).IsUnique();

        builder
            .HasOne(l => l.Warehouse)
            .WithMany(w => w.Locations)
            .HasForeignKey(l => l.WarehouseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
