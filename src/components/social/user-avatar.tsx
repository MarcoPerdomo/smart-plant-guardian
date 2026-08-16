type Profileish = {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
} | null;

export function displayNameOf(p: Profileish) {
  return p?.display_name?.trim() || (p?.username ? `@${p.username}` : "A gardener");
}

export function UserAvatar({ profile, size = 40 }: { profile: Profileish; size?: number }) {
  const label = displayNameOf(profile);
  const initials = label.replace(/^@/, "").slice(0, 2).toUpperCase();
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={label}
        width={size}
        height={size}
        className="rounded-full object-cover bg-muted shrink-0"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className="rounded-full bg-primary/15 text-primary font-medium flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
