/**
 * Opt-in mobile shell V3 (hard-isolated). Default off — production unchanged.
 *
 * Local test: `.env.local`
 *   NEXT_PUBLIC_MOBILE_LAYOUT_V3=true
 * then restart `npm run dev` and open `/hr/debug/mobile-layout-v3`.
 *
 * Phase 1: V3 shell applies only on {@link isMobileLayoutV3ShellRoute} — not /home or other app routes.
 */
export function isMobileLayoutV3Enabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_MOBILE_LAYOUT_V3?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/** Phase 1: V3 shell is limited to the debug route until explicitly expanded. */
export function isMobileLayoutV3ShellRoute(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "/").replace(/\/+$/, "") || "/";
  return path === "/debug/mobile-layout-v3";
}
