import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminWeeklyChallengesPage } from "@/components/admin/AdminWeeklyChallengesPage";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("adminWeeklyChallengesTitle"),
    robots: PRIVATE_PAGE_ROBOTS,
  };
}

export default async function AdminWeeklyChallengesRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminWeeklyChallengesPage />;
}
