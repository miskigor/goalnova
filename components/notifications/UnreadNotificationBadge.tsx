"use client";

type Variant = "header" | "navCompact" | "navSidebar";

/**
 * Minimal unread count pill; renders nothing when count is 0.
 * Parent link should set aria-label including the count when shown.
 */
export function UnreadNotificationBadge({
  count,
  variant = "header",
}: {
  count: number;
  variant?: Variant;
}) {
  if (count <= 0) return null;

  const text = count > 99 ? "99+" : String(count);

  const layout =
    variant === "navCompact"
      ? "absolute end-0 top-0 h-3.5 min-w-3.5 translate-x-1/4 -translate-y-1/4 px-[3px] text-[8px]"
      : variant === "navSidebar"
        ? "absolute end-0 top-0 translate-x-1/3 -translate-y-1/3 h-[1.125rem] min-w-[1.125rem] px-1 text-[10px]"
        : "absolute end-0 top-0 translate-x-1/3 -translate-y-1/4 h-[1.125rem] min-w-[1.125rem] px-1 text-[10px]";

  return (
    <span
      className={`${layout} flex items-center justify-center rounded-full bg-gn-accent font-bold tabular-nums leading-none text-gn-bg`}
      aria-hidden
    >
      {text}
    </span>
  );
}
