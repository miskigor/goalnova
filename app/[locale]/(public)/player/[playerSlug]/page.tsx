import type { Metadata } from "next";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { PlayerPublicProfilePage } from "@/components/profile/PlayerPublicProfilePage";
import { PublicPlayerJsonLd } from "@/components/share/PublicPlayerJsonLd";
import { buildLocaleAlternates, localizedCanonicalPath } from "@/lib/seo/alternates";
import { buildBrandLinkPreviewMetadata } from "@/lib/seo/englishLinkPreview";
import { getServerSiteOrigin, siteMetadataBase } from "@/lib/site/serverSiteOrigin";
import { createAnonSupabaseServerClient } from "@/lib/supabase/anonServerClient";
import {
  normalizePlayerProfileSlug,
  rpcResolvePublicPlayerProfileBySlug,
} from "@/lib/supabase/publicPlayerProfiles";

type Props = {
  params: Promise<{ locale: string; playerSlug: string }>;
};

const PLAYER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function preferredPlayerPathSegment(
  data: Awaited<ReturnType<typeof getPlayerProfile>>,
  slug: string,
): string {
  const username = (data?.username ?? "").trim();
  if (username) return username;
  return slug;
}

export const revalidate = 60;

const getPlayerProfile = cache(async (slug: string) => {
  const supabase = createAnonSupabaseServerClient();
  if (!supabase || !slug.trim()) return null;

  const { row } = await rpcResolvePublicPlayerProfileBySlug(supabase, slug);
  return row;
});

async function getPlayerVideos(userId: string) {
  const supabase = createAnonSupabaseServerClient();
  if (!supabase || !userId.trim()) return [];

  const { data } = await supabase
    .from("videos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, playerSlug } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const origin = getServerSiteOrigin();
  const metadataBase = siteMetadataBase(origin);
  const slug = normalizePlayerProfileSlug(playerSlug ?? "");
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

  const pathname = `/player/${encodeURIComponent(preferredPlayerPathSegment(data, slug))}`;
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

  const slug = normalizePlayerProfileSlug(playerSlug ?? "");
  const data = await getPlayerProfile(slug);

  const preferredSlug = preferredPlayerPathSegment(data, slug);
  if (
    data &&
    PLAYER_UUID_RE.test(slug) &&
    preferredSlug !== slug
  ) {
    redirect({ href: `/player/${encodeURIComponent(preferredSlug)}`, locale });
  }

  const initialVideos = data?.id ? await getPlayerVideos(data.id) : [];
  const initialUserAvatarUrl =
    typeof data?.avatar_url === "string" ? data.avatar_url.trim() || null : null;

  const name = (data?.full_name ?? "").trim() || null;
  const username = (data?.username ?? "").trim() || null;
  const city = (data?.city ?? "").trim() || null;
  const country = (data?.country ?? "").trim() || null;
  const position = (data?.position ?? "").trim() || null;
  const club = (data?.club ?? "").trim() || null;
  const display = name || username || slug;
  const parts = [position, club, city, country].filter(Boolean);
  const description =
    parts.length > 0 ? `${display} — ${parts.join(" · ")}` : display;

  return (
    <>
      {data ? (
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
      ) : null}
      <PlayerPublicProfilePage
        playerSlug={slug}
        initialProfile={data}
        initialUserAvatarUrl={initialUserAvatarUrl}
        initialVideos={initialVideos}
      />
    </>
  );
}
