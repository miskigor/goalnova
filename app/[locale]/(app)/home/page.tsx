import type { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeCleanV3 } from "@/components/home/v3-clean/HomeCleanV3";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("homeTitle"), robots: PRIVATE_PAGE_ROBOTS };
}

/** Production `/home` — clean feed layout for all users (see homeCleanV3.tokens.css). */
export default async function HomeFeedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeCleanV3 />;
}
