import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeFeed } from "@/components/home/HomeFeed";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("homeTitle") };
}

export default async function HomeFeedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeFeed />;
}
