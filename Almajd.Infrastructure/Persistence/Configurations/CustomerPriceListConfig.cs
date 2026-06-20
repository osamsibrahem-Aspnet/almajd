using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class CustomerPriceListConfig : IEntityTypeConfiguration<CustomerPriceList>
{
    public void Configure(EntityTypeBuilder<CustomerPriceList> builder)
    {
        builder.HasIndex(c => new { c.CustomerId, c.PriceListId }).IsUnique();
        builder.HasIndex(c => new { c.CustomerId, c.Priority });

        builder
            .HasOne(c => c.Customer)
            .WithMany()
            .HasForeignKey(c => c.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(c => c.PriceList)
            .WithMany()
            .HasForeignKey(c => c.PriceListId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
