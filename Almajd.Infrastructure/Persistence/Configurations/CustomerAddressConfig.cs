using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class CustomerAddressConfig : IEntityTypeConfiguration<CustomerAddress>
{
    public void Configure(EntityTypeBuilder<CustomerAddress> builder)
    {
        builder.Property(a => a.Kind).HasConversion<string>().HasMaxLength(32);
        builder.Property(a => a.Line1).IsRequired().HasMaxLength(256);
        builder.Property(a => a.Line2).HasMaxLength(256);
        builder.Property(a => a.City).IsRequired().HasMaxLength(128);
        builder.Property(a => a.Region).HasMaxLength(128);
        builder.Property(a => a.Country).HasMaxLength(64);

        builder.HasIndex(a => new { a.CustomerId, a.Kind, a.IsDefault });

        builder
            .HasOne(a => a.Customer)
            .WithMany(c => c.Addresses)
            .HasForeignKey(a => a.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
