export function CountBadge({ count, label }: { count: number; label?: string }) {
  if (count <= 0) return null;
  const text = count > 9 ? "9+" : String(count);
  return (
    <span
      aria-label={label ? `${label}: ${text}` : text}
      className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold"
    >
      {text}
    </span>
  );
}
