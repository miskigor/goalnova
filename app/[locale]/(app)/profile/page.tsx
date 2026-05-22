import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OwnProfileView } from "@/components/profile/OwnProfileView";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("profileTitle"), robots: PRIVATE_PAGE_ROBOTS };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <OwnProfileView />;
}
