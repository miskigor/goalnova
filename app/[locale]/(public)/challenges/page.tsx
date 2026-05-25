import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChallengesHub } from "@/components/challenges/ChallengesHub";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { GuestPublicCallout } from "@/components/layout/GuestPublicCallout";
import { ChallengesPageHeader } from "./ChallengesPageHeader";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "challenges" });
  return { title: t("title") };
}

export default async function ChallengesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppMobileTabPageShell data-challenges-page>
      <GuestPublicCallout />
      <ChallengesPageHeader />
      <ChallengesHub />
    </AppMobileTabPageShell>
  );
}
