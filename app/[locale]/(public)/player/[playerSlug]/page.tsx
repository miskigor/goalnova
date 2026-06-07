import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlayerPublicProfilePage } from "@/components/profile/PlayerPublicProfilePage";
import { PublicPlayerJsonLd } from "@/components/share/PublicPlayerJsonLd";
import { buildLocaleAlternates, localizedCanonicalPath } from "@/lib/seo/alternates";
import { buildBrandLinkPreviewMetadata } from "@/lib/seo/englishLinkPreview";
import { getServerSiteOrigin, siteMetadataBase } from "@/lib/site/serverSiteOrigin";
import { createAnonSupabaseServerClient } from "@/lib/supabase/anonServerClient";

type Props = {
  params: Promise<{ locale: string; playerSlug: string }>;
};

function escapeIlikeExact(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function isUuidLike(value: string): boolean {
  const s = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

async function getPlayerProfile(slug: string) {
  const supabase = createAnonSupabaseServerClient();
  if (!supabase || !slug.trim()) return null;

  const q = isUuidLike(slug)
    ? supabase.from("player_profiles").select("*").eq("id", slug).maybeSingle()
    : supabase
        .from("player_profiles")
        .select("*")
        .ilike("username", escapeIlikeExact(slug))
        .maybeSingle();

  const { data } = await q;
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, playerSlug } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const origin = getServerSiteOrigin();
  const metadataBase = siteMetadataBase(origin);
  const slug = (playerSlug ?? "").trim();
  const data = await getPlayerProfile(slug);

  const name = (data?.full_name ?? "").trim() || null;
  const username = (data?.username ?? "").trim() || null;
  const city = (data?.city ?? "").trim() || null;
  const country = (data?.country ?? "").trim() || null;
  const position = (data?.position ?? "").trim() || null;
  const club = (data?.club ?? "").trim() || null;

  const display = name || username || slug || t("playerProfileTitle");
  const title = `${display} · PitchRusch`;
  const parts = [position, club, city, country].filter(Boolean);
  const description =
    parts.length > 0
      ? `${display} — ${parts.join(" · ")}`
      : t("rootDescription");

  const pathname = `/player/${encodeURIComponent(playerSlug)}`;
  const canonicalPath = localizedCanonicalPath(locale, pathname);
  const linkPreview = buildBrandLinkPreviewMetadata({ canonicalPath, origin });

  return {
    metadataBase,
    title,
    description,
    alternates: {
      ...buildLocaleAlternates(pathname),
      canonical: canonicalPath,
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      ...linkPreview.openGraph,
      type: "profile",
      title,
      description,
      url: canonicalPath,
    },
    twitter: {
      ...linkPreview.twitter,
      title,
      description,
    },
  };
}

export default async function PlayerProfilePage({ params }: Props) {
  const { locale, playerSlug } = await params;
  setRequestLocale(locale);

  const slug = (playerSlug ?? "").trim();
  const data = await getPlayerProfile(slug);
  if (!data) notFound();

  const name = (data.full_name ?? "").trim() || null;
  const username = (data.username ?? "").trim() || null;
  const city = (data.city ?? "").trim() || null;
  const country = (data.country ?? "").trim() || null;
  const position = (data.position ?? "").trim() || null;
  const club = (data.club ?? "").trim() || null;
  const display = name || username || slug;
  const parts = [position, club, city, country].filter(Boolean);
  const description =
    parts.length > 0 ? `${display} — ${parts.join(" · ")}` : display;

  return (
    <>
      <PublicPlayerJsonLd
        locale={locale}
        slug={slug}
        displayName={display}
        username={username}
        description={description}
        position={position}
        club={club}
        city={city}
        country={country}
      />
      <PlayerPublicProfilePage playerSlug={playerSlug} />
    </>
  );
}
