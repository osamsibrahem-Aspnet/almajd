using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class UserNotificationPreferenceConfig : IEntityTypeConfiguration<UserNotificationPreference>
{
    public void Configure(EntityTypeBuilder<UserNotificationPreference> builder)
    {
        builder.Property(p => p.Category).HasConversion<string>().HasMaxLength(32);
        builder.Property(p => p.Channel).HasConversion<string>().HasMaxLength(32);

        builder.HasIndex(p => new { p.UserId, p.Category, p.Channel }).IsUnique();

        builder
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
