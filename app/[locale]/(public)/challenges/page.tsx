import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChallengesPageView } from "@/components/challenges/ChallengesPageView";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { GuestPublicCallout } from "@/components/layout/GuestPublicCallout";
import { buildPublicPageMetadata } from "@/lib/seo/buildPublicPageMetadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "challenges" });
  return buildPublicPageMetadata({
    locale,
    pathname: "/challenges",
    title: `${t("title")} · PitchRusch`,
    description: t("subtitle"),
  });
}

export default async function ChallengesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppMobileTabPageShell data-pitchrusch-explore-page data-challenges-page>
      <GuestPublicCallout />
      <ChallengesPageView />
    </AppMobileTabPageShell>
  );
}
