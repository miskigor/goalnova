import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";

const DEFAULT_ORIGIN = "https://pitchrusch.com";

/** Absolute URL for the branded video share preview image (OG / WhatsApp / Instagram). */
export function buildBrandedVideoOgImageUrl(videoId: string, origin?: string | null): string {
  const base = (origin ?? getServerSiteOrigin() ?? DEFAULT_ORIGIN).replace(/\/$/, "");
  return `${base}/og/video/${encodeURIComponent(videoId)}`;
}
