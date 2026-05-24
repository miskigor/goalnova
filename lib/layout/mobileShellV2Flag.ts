/** Phase 1+ mobile shell V2 — opt-in via env; off keeps {@link AppMobileChromePortal}. */
export function isMobileShellV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_MOBILE_SHELL_V2 === "1";
}
