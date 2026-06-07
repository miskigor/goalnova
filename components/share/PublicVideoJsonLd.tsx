import { absolutePublicVideoUrl } from "@/lib/share/localizedVideoPath";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";

type Props = {
  locale: string;
  videoId: string;
  displayName: string;
  description: string;
  videoContentUrl: string;
  uploadDateIso: string | null | undefined;
  thumbnailUrl?: string | null;
};

/**
 * schema.org VideoObject for crawlers and rich results (complements Open Graph tags).
 */
export function PublicVideoJsonLd({
  locale,
  videoId,
  displayName,
  description,
  videoContentUrl,
  uploadDateIso,
  thumbnailUrl,
}: Props) {
  const base = getServerSiteOrigin();
  const pageUrl =
    base ? absolutePublicVideoUrl(base, locale, videoId) : undefined;

  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${displayName} · PitchRusch`,
    description: description.trim() || undefined,
    contentUrl: videoContentUrl,
    embedUrl: pageUrl,
    url: pageUrl,
    thumbnailUrl: thumbnailUrl?.trim() || undefined,
    inLanguage: locale,
    genre: "Sports",
    sport: "Soccer",
    author: {
      "@type": "Person",
      name: displayName,
    },
    publisher: {
      "@type": "Organization",
      name: "PitchRusch",
      ...(base ? { url: base } : {}),
    },
  };

  if (uploadDateIso && uploadDateIso.trim()) {
    payload.uploadDate = uploadDateIso;
  }

  return (
    <script
      type="application/ld+json"
      // Safe: built from server data only, no user HTML.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload),
      }}
    />
  );
}
