/**
 * Absolute site origin for canonical URLs and server-rendered metadata.
 * Prefer NEXT_PUBLIC_SITE_URL in production (e.g. https://pitchrusch.com).
 *
 * Always returns either a value safe to pass to `new URL(...)` or `null`.
 * Invalid env values must not fall through as raw strings — that used to crash
 * `generateMetadata` when Next called `new URL(origin)`.
 */
function parseOriginUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!u.host) return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export function getServerSiteOrigin(): string | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    const parsed = parseOriginUrl(explicit);
    if (parsed) return parsed;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    if (!host) return null;
    return parseOriginUrl(`https://${host}`);
  }
  return null;
}

/**
 * Safe `metadataBase` for `generateMetadata` / `Metadata` — never throws.
 */
export function siteMetadataBase(origin: string | null | undefined): URL | undefined {
  if (!origin) return undefined;
  try {
    const u = new URL(origin.endsWith("/") ? origin.slice(0, -1) : origin);
    if (!u.host) return undefined;
    return u;
  } catch {
    return undefined;
  }
}
