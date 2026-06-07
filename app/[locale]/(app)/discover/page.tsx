import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DiscoverView } from "@/components/discover/DiscoverView";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("discoverTitle"), robots: PRIVATE_PAGE_ROBOTS };
}

export default async function DiscoverPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DiscoverView />;
}
