using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class DeviceTokenConfig : IEntityTypeConfiguration<DeviceToken>
{
    public void Configure(EntityTypeBuilder<DeviceToken> builder)
    {
        builder.Property(d => d.Platform).IsRequired().HasMaxLength(16);
        builder.Property(d => d.Token).IsRequired().HasMaxLength(512);

        builder.HasIndex(d => d.Token).IsUnique();
        builder.HasIndex(d => new { d.UserId, d.IsActive });

        builder
            .HasOne(d => d.User)
            .WithMany()
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
