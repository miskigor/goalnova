"use client";

type Props = {
  /** Compact dot for bottom nav emoji stack. */
  variant?: "bottomNav" | "inline";
};

/** Small accent dot — today's quiz not answered yet. */
export function DailyQuizPendingDot({ variant = "inline" }: Props) {
  const layout =
    variant === "bottomNav"
      ? "absolute end-0 top-0 h-2.5 w-2.5 -translate-y-1/4 translate-x-1/4 rounded-full bg-gn-accent ring-2 ring-gn-bg"
      : "h-2 w-2 shrink-0 rounded-full bg-gn-accent";

  return <span className={layout} aria-hidden />;
}
