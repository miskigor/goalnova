import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_LOGO_SRC } from "@/lib/constants/brand";

let cachedLogoDataUrl: string | null = null;

/** PNG logo from `public/` as a data URL for `next/og` ImageResponse. */
export async function loadOgBrandLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  const relative = BRAND_LOGO_SRC.replace(/^\//, "");
  const buf = await readFile(join(process.cwd(), "public", relative));
  cachedLogoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  return cachedLogoDataUrl;
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
