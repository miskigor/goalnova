import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";
import { localizedCanonicalPath } from "@/lib/seo/alternates";

type Props = {
  locale: string;
  slug: string;
  displayName: string;
  username: string | null;
  description: string;
  position: string | null;
  club: string | null;
  city: string | null;
  country: string | null;
};

/** schema.org ProfilePage + Person for public player profiles. */
export function PublicPlayerJsonLd({
  locale,
  slug,
  displayName,
  username,
  description,
  position,
  club,
  city,
  country,
}: Props) {
  const base = getServerSiteOrigin()?.replace(/\/$/, "");
  const path = localizedCanonicalPath(locale, `/player/${encodeURIComponent(slug)}`);
  const pageUrl = base ? `${base}${path}` : undefined;

  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        name: `${displayName} · PitchRusch`,
        description: description.trim() || undefined,
        url: pageUrl,
        inLanguage: locale,
        mainEntity: { "@id": pageUrl ? `${pageUrl}#person` : undefined },
      },
      {
        "@type": "Person",
        "@id": pageUrl ? `${pageUrl}#person` : undefined,
        name: displayName,
        alternateName: username ?? undefined,
        description: description.trim() || undefined,
        url: pageUrl,
        jobTitle: position ?? undefined,
        worksFor: club ? { "@type": "SportsTeam", name: club } : undefined,
        homeLocation:
          city || country
            ? {
                "@type": "Place",
                name: [city, country].filter(Boolean).join(", "),
              }
            : undefined,
        sport: "Soccer",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
