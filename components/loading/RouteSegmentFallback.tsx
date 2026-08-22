/**
 * In-route placeholder while a page RSC streams. Not the branded splash —
 * that unmounts chrome and makes every tab feel like a cold start.
 */
export function RouteSegmentFallback() {
  return (
    <div
      className="flex min-h-[40vh] w-full min-w-0 flex-1 flex-col gap-3 px-4 py-8"
      role="status"
      aria-live="polite"
      aria-busy
      aria-label="Loading"
    >
      <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
      <div className="h-28 w-full animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="h-28 w-full animate-pulse rounded-2xl bg-white/[0.06]" />
    </div>
  );
}
