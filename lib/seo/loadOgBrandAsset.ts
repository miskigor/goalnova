import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_LOGO_SRC } from "@/lib/constants/brand";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";

const DEFAULT_SITE_ORIGIN = "https://pitchrusch.com";

let cachedLogoDataUrl: string | null = null;

function brandLogoPublicUrl(): string {
  const origin = (getServerSiteOrigin() ?? DEFAULT_SITE_ORIGIN).replace(/\/$/, "");
  return `${origin}${BRAND_LOGO_SRC}`;
}

/** Brand logo as a data URL for `next/og` ImageResponse (local file or CDN fetch). */
export async function loadOgBrandLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  try {
    const relative = BRAND_LOGO_SRC.replace(/^\//, "");
    const buf = await readFile(join(process.cwd(), "public", relative));
    cachedLogoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    return cachedLogoDataUrl;
  } catch {
    // Netlify/serverless: `public/` is not on the function filesystem — fetch from CDN.
  }

  const fetched = await fetchImageAsDataUrl(brandLogoPublicUrl());
  if (fetched) {
    cachedLogoDataUrl = fetched;
    return cachedLogoDataUrl;
  }

  return brandLogoPublicUrl();
}

export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
