import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClubsPageView } from "@/components/clubs/ClubsPageView";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { GuestPublicCallout } from "@/components/layout/GuestPublicCallout";
import { buildPublicPageMetadata } from "@/lib/seo/buildPublicPageMetadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clubs" });
  return buildPublicPageMetadata({
    locale,
    pathname: "/clubs",
    title: `${t("title")} · PitchRusch`,
    description: t("subtitle"),
  });
}

export default async function ClubsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppMobileTabPageShell>
      <GuestPublicCallout />
      <ClubsPageView />
    </AppMobileTabPageShell>
  );
}
