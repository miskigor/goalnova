"use client";

type Variant = "header" | "navCompact" | "navSidebar" | "bottomNav";

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
    variant === "bottomNav"
      ? "absolute end-1 top-0 z-[5] h-4 min-w-4 -translate-y-1/3 px-1 text-[10px] leading-none ring-2 ring-gn-bg"
      : variant === "navCompact"
        ? "absolute end-0 top-0 h-3.5 min-w-3.5 -translate-y-1/4 px-[3px] text-[8px]"
        : variant === "navSidebar"
          ? "absolute end-0 top-0 -translate-y-1/3 h-[1.125rem] min-w-[1.125rem] px-1 text-[10px]"
          : "absolute end-0 top-0 -translate-y-1/4 h-[1.125rem] min-w-[1.125rem] px-1 text-[10px]";

  const shape =
    variant === "bottomNav" ? "rounded-md" : "rounded-full";

  return (
    <span
      data-dm-unread-count
      className={`${layout} ${shape} pointer-events-none flex items-center justify-center bg-gn-accent font-bold tabular-nums text-gn-bg`}
      aria-hidden
    >
      {text}
    </span>
  );
}
