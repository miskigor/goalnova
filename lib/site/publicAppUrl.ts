/**
 * Absolute origin for auth redirect URLs (password reset). Prefer env in production.
 * `NEXT_PUBLIC_APP_URL` overrides; else `NEXT_PUBLIC_SITE_URL` (see getServerSiteOrigin).
 */
export function getPublicAppOriginForClient(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    const fromEnv =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (fromEnv) {
      try {
        const u = new URL(fromEnv.includes("://") ? fromEnv : `https://${fromEnv}`);
        return `${u.protocol}//${u.host}`;
      } catch {
        return fromEnv.replace(/\/$/, "");
      }
    }
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}
