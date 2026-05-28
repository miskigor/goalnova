import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { SettingsMainPage } from "@/components/settings/SettingsMainPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("settingsTitle") };
}

export default async function BenefitsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppMobileTabPageShell>
      <SettingsMainPage />
    </AppMobileTabPageShell>
  );
}
