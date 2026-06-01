/**
 * Shown while the locale layout streams (messages) or a `[locale]` route segment loads.
 * Black background avoids a long white flash on cold visits (e.g. from search).
 */
import { PitchruschLoadingScreen } from "@/components/loading/PitchruschLoadingScreen";

export function LocaleRouteFallback() {
  return <PitchruschLoadingScreen />;
}
