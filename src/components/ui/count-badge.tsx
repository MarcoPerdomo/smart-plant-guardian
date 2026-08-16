export function CountBadge({
  count,
  label,
  size = "default",
}: {
  count: number;
  label?: string;
  size?: "default" | "sm";
}) {
  if (count <= 0) return null;
  const text = count > 9 ? "9+" : String(count);
  const sizing =
    size === "sm"
      ? "min-w-[0.875rem] h-3.5 px-[3px] text-[9px] leading-none"
      : "min-w-[1.25rem] h-5 px-1 text-[10px]";
  return (
    <span
      aria-label={label ? `${label}: ${text}` : text}
      className={`inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold ${sizing}`}
    >
      {text}
    </span>
  );
}
