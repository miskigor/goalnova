import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";
import { buildLocaleAlternates, localizedCanonicalPath } from "@/lib/seo/alternates";
import { getServerSiteOrigin, siteMetadataBase } from "@/lib/site/serverSiteOrigin";

/** Open Graph `locale` — align with app locales where possible. */
const OG_LOCALE: Partial<Record<AppLocale, string>> = {
  en: "en_US",
  hr: "hr_HR",
  de: "de_DE",
  es: "es_ES",
  pt: "pt_PT",
  fr: "fr_FR",
  it: "it_IT",
  ar: "ar_SA",
};

export function inferVideoMimeType(videoUrl: string): string | undefined {
  const u = videoUrl.split("?")[0]?.toLowerCase() ?? "";
  if (u.endsWith(".mp4") || u.includes(".mp4")) return "video/mp4";
  if (u.endsWith(".webm") || u.includes(".webm")) return "video/webm";
  if (u.endsWith(".mov") || u.includes(".mov")) return "video/quicktime";
  return undefined;
}

function isAppLocale(locale: string): locale is AppLocale {
  return (routing.locales as readonly string[]).includes(locale);
}

export type PublicVideoMetadataInput =
  | { status: "not_found"; notFoundTitle: string }
  | {
      status: "ok";
      title: string;
      description: string;
      videoUrl: string;
      videoId: string;
      locale: string;
    };

/**
 * Next.js metadata for the public video share page — Open Graph video + Twitter + robots.
 */
export function buildPublicVideoMetadata(
  input: PublicVideoMetadataInput,
): Metadata {
  const base = getServerSiteOrigin();

  if (input.status === "not_found") {
    return {
      title: input.notFoundTitle,
      robots: { index: false, follow: true },
    };
  }

  const { title, description, videoUrl, videoId, locale } = input;
  const ogLocale = isAppLocale(locale) ? (OG_LOCALE[locale] ?? "en_US") : "en_US";
  const mime = inferVideoMimeType(videoUrl);
  const isHttps = videoUrl.startsWith("https://");
  const pathname = `/video/${encodeURIComponent(videoId)}`;
  const canonicalPath = localizedCanonicalPath(locale, pathname);

  const metadataBase = siteMetadataBase(base);
  const metadata: Metadata = {
    ...(metadataBase ? { metadataBase } : {}),
    title,
    description,
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    alternates: {
      ...buildLocaleAlternates(pathname),
      canonical: canonicalPath,
    },
    openGraph: {
      type: "video.other",
      title,
      description,
      url: canonicalPath,
      siteName: "PitchRusch",
      locale: ogLocale,
      videos: [
        {
          url: videoUrl,
          ...(isHttps ? { secureUrl: videoUrl } : {}),
          ...(mime ? { type: mime } : {}),
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };

  return metadata;
}
