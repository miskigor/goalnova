/**
 * Shown while the locale layout streams (messages) or a `[locale]` route segment loads.
 * Black background avoids a long white flash on cold visits (e.g. from search).
 */
export function LocaleRouteFallback() {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col items-center justify-center bg-black px-4">
      <div
        className="size-[min(28vw,8rem)] animate-pulse rounded-3xl bg-white/[0.06]"
        aria-hidden
      />
      <div className="mt-8 h-1.5 w-28 animate-pulse rounded-full bg-gn-accent/30" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
