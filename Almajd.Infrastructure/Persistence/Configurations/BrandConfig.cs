using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class BrandConfig : IEntityTypeConfiguration<Brand>
{
    public void Configure(EntityTypeBuilder<Brand> builder)
    {
        builder.Property(b => b.Name).IsRequired().HasMaxLength(128);
        builder.Property(b => b.Slug).IsRequired().HasMaxLength(160);
        builder.Property(b => b.LogoPath).HasMaxLength(512);

        builder.HasIndex(b => b.Slug).IsUnique();
        builder.HasIndex(b => b.Name);
    }
}
