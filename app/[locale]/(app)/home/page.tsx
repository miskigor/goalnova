import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildBrandLinkPreviewMetadata } from "@/lib/seo/englishLinkPreview";
import { localizedCanonicalPath } from "@/lib/seo/alternates";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";
import { HomePageWithCampaign } from "@/components/home/HomePageWithCampaign";
import { createAnonSupabaseServerClient } from "@/lib/supabase/anonServerClient";
import {
  fetchHomeFeedData,
  HOME_FEED_PAGE_SIZE,
} from "@/lib/supabase/homeFeed";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const origin = getServerSiteOrigin();
  const linkPreview = buildBrandLinkPreviewMetadata({
    canonicalPath: localizedCanonicalPath(locale, "/home"),
    origin,
  });
  const title = t("homeTitle");

  return {
    title,
    robots: PRIVATE_PAGE_ROBOTS,
    openGraph: { ...linkPreview.openGraph, title },
    twitter: { ...linkPreview.twitter, title },
  };
}

/** Production `/home` — clean feed layout for all users (see homeCleanV3.tokens.css). */
export default async function HomeFeedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createAnonSupabaseServerClient();
  const { items: initialFeedItems } = supabase
    ? await fetchHomeFeedData(supabase, { limit: HOME_FEED_PAGE_SIZE })
    : { items: [] };

  return <HomePageWithCampaign initialFeedItems={initialFeedItems} />;
}
