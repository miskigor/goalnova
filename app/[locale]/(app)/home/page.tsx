import type { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeFeedSkeleton } from "@/components/home/HomeFeedSkeleton";

const HomeFeed = dynamic(
  () => import("@/components/home/HomeFeed").then((m) => ({ default: m.HomeFeed })),
  { loading: () => <HomeFeedSkeleton /> },
);

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("homeTitle"), robots: PRIVATE_PAGE_ROBOTS };
}

export default async function HomeFeedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeFeed />;
}
