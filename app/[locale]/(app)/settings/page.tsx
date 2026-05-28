import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BenefitsReferralPage } from "@/components/benefits/BenefitsReferralPage";
import { SettingsMainPage } from "@/components/settings/SettingsMainPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("settingsTitle") };
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-w-0 max-w-full space-y-8 max-lg:space-y-5">
      <SettingsMainPage />
      <BenefitsReferralPage variant="settings-extras" />
    </div>
  );
}
