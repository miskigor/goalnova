/**
 * Shown while the locale layout streams (messages) or a `[locale]` route segment loads.
 * Black background avoids a white flash; keep it light so navigations are not a logo splash.
 */
import { RouteSegmentFallback } from "@/components/loading/RouteSegmentFallback";

export function LocaleRouteFallback() {
  return (
    <div className="min-h-dvh w-full bg-black">
      <RouteSegmentFallback />
    </div>
  );
}
