/**
 * Opt-in mobile shell rebuild (V2). Default off — production keeps AppChromeLayout V1.
 *
 * Local iPhone test: set in `.env.local`
 *   NEXT_PUBLIC_MOBILE_LAYOUT_STABLE_V2=true
 * then restart `npm run dev`.
 */
export function isMobileLayoutStableV2Enabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_MOBILE_LAYOUT_STABLE_V2?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
