using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class PickListConfig : IEntityTypeConfiguration<PickList>
{
    public void Configure(EntityTypeBuilder<PickList> builder)
    {
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(32);

        builder.HasIndex(p => p.OrderId).IsUnique();
        builder.HasIndex(p => new { p.Status, p.GeneratedAt });

        builder
            .HasOne(p => p.Order)
            .WithOne()
            .HasForeignKey<PickList>(p => p.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(p => p.PickedBy)
            .WithMany()
            .HasForeignKey(p => p.PickedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
