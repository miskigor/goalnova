import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileEditor } from "@/components/profile/ProfileEditor";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("profileTitle") };
}

export default async function SettingsProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ProfileEditor />;
}
