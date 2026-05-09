/**
 * Absolute site origin for canonical URLs and server-rendered metadata.
 * Prefer NEXT_PUBLIC_SITE_URL in production (e.g. https://pitchrusch.com).
 */
export function getServerSiteOrigin(): string | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      const u = new URL(explicit.includes("://") ? explicit : `https://${explicit}`);
      return `${u.protocol}//${u.host}`;
    } catch {
      return explicit.replace(/\/$/, "");
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  return null;
}
