using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class SupplierConfig : IEntityTypeConfiguration<Supplier>
{
    public void Configure(EntityTypeBuilder<Supplier> builder)
    {
        builder.Property(s => s.Code).IsRequired().HasMaxLength(32);
        builder.Property(s => s.Name).IsRequired().HasMaxLength(256);
        builder.Property(s => s.TaxId).HasMaxLength(64);
        builder.Property(s => s.Phone).HasMaxLength(32);
        builder.Property(s => s.Email).HasMaxLength(256);
        builder.Property(s => s.Address).HasMaxLength(512);
        builder.Property(s => s.ContactPerson).HasMaxLength(128);
        builder.Property(s => s.Currency).IsRequired().HasMaxLength(8);

        builder.HasIndex(s => s.Code).IsUnique();
        builder.HasIndex(s => s.Name);
        builder.HasIndex(s => s.IsActive);
    }
}
