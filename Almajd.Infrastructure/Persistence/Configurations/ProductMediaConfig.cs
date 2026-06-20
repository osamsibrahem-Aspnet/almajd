using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class ProductMediaConfig : IEntityTypeConfiguration<ProductMedia>
{
    public void Configure(EntityTypeBuilder<ProductMedia> builder)
    {
        builder.Property(m => m.Url).IsRequired().HasMaxLength(1024);
        builder.Property(m => m.Kind).HasConversion<string>().HasMaxLength(32);

        builder.HasIndex(m => new { m.ProductId, m.SortOrder });

        builder
            .HasOne(m => m.Product)
            .WithMany(p => p.Media)
            .HasForeignKey(m => m.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
