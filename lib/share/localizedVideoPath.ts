import { routing } from "@/i18n/routing";

/** Path-only URL segment for the public video page (locale prefix when not default). */
export function localizedPublicVideoPath(locale: string, videoId: string): string {
  const id = String(videoId ?? "").trim();
  if (!id) return "/video";
  const enc = encodeURIComponent(id);
  if (locale === routing.defaultLocale) {
    return `/video/${enc}`;
  }
  return `/${locale}/video/${enc}`;
}

export function absolutePublicVideoUrl(
  origin: string,
  locale: string,
  videoId: string,
): string {
  const base = origin.replace(/\/$/, "");
  const path = localizedPublicVideoPath(locale, videoId);
  return `${base}${path}`;
}
