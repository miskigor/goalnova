import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlayerPublicProfile } from "@/components/profile/PlayerPublicProfile";
import { routing } from "@/i18n/routing";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, playerSlug } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const origin = getServerSiteOrigin();
  const metadataBase = origin ? new URL(origin) : undefined;
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const slug = (playerSlug ?? "").trim();
  const supabase = createAnonSupabaseServerClient();

  let name: string | null = null;
  let username: string | null = null;
  let city: string | null = null;
  let country: string | null = null;
  let position: string | null = null;
  let club: string | null = null;

  if (supabase && slug) {
    const q = isUuidLike(slug)
      ? supabase.from("player_profiles").select("*").eq("id", slug).maybeSingle()
      : supabase
          .from("player_profiles")
          .select("*")
          .ilike("username", escapeIlikeExact(slug))
          .maybeSingle();

    const { data } = await q;
    if (data) {
      name = (data.full_name ?? "").trim() || null;
      username = (data.username ?? "").trim() || null;
      city = (data.city ?? "").trim() || null;
      country = (data.country ?? "").trim() || null;
      position = (data.position ?? "").trim() || null;
      club = (data.club ?? "").trim() || null;
    }
  }

  const display = name || username || slug || t("playerProfileTitle");
  const title = `${display} · PitchRusch`;
  const parts = [position, club, city, country].filter(Boolean);
  const description =
    parts.length > 0
      ? `${display} — ${parts.join(" · ")}`
      : t("rootDescription");

  const canonicalPath = `/player/${encodeURIComponent(playerSlug)}`;
  const canonical = `${localePrefix}${canonicalPath}`;

  return {
    metadataBase,
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "profile",
      title,
      description,
      url: canonical,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PlayerProfilePage({ params }: Props) {
  const { locale, playerSlug } = await params;
  setRequestLocale(locale);

  return <PlayerPublicProfile playerSlug={playerSlug} />;
}
