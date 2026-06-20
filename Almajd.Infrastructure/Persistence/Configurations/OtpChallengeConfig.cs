using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class OtpChallengeConfig : IEntityTypeConfiguration<OtpChallenge>
{
    public void Configure(EntityTypeBuilder<OtpChallenge> builder)
    {
        builder.Property(c => c.PhoneE164).IsRequired().HasMaxLength(32);
        builder.Property(c => c.CodeHash).IsRequired().HasMaxLength(256);
        builder.Property(c => c.Ip).HasMaxLength(64);

        builder.HasIndex(c => new { c.PhoneE164, c.VerifiedAt, c.ExpiresAt });
        builder.HasIndex(c => c.ExpiresAt);
    }
}
