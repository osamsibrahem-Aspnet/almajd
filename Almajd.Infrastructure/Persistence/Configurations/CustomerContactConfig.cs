using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class CustomerContactConfig : IEntityTypeConfiguration<CustomerContact>
{
    public void Configure(EntityTypeBuilder<CustomerContact> builder)
    {
        builder.Property(c => c.Name).IsRequired().HasMaxLength(128);
        builder.Property(c => c.Role).HasMaxLength(64);
        builder.Property(c => c.Phone).HasMaxLength(32);
        builder.Property(c => c.Email).HasMaxLength(256);

        builder.HasIndex(c => new { c.CustomerId, c.IsPrimary });

        builder
            .HasOne(c => c.Customer)
            .WithMany(x => x.Contacts)
            .HasForeignKey(c => c.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
