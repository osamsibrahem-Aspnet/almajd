using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class PriceListConfig : IEntityTypeConfiguration<PriceList>
{
    public void Configure(EntityTypeBuilder<PriceList> builder)
    {
        builder.Property(p => p.Name).IsRequired().HasMaxLength(128);
        builder.Property(p => p.Currency).IsRequired().HasMaxLength(8);
        builder.Property(p => p.Tier).HasConversion<string>().HasMaxLength(32);

        builder.HasIndex(p => p.Name).IsUnique();
        builder.HasIndex(p => new { p.IsDefault, p.IsActive });
        builder.HasIndex(p => p.Tier);
    }
}
