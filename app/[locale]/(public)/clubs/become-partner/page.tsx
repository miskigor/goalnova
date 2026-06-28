import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BecomePartnerView } from "@/components/clubs/BecomePartnerView";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { buildPublicPageMetadata } from "@/lib/seo/buildPublicPageMetadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clubs" });
  return buildPublicPageMetadata({
    locale,
    pathname: "/clubs/become-partner",
    title: `${t("becomePartnerTitle")} · PitchRusch`,
    description: t("becomePartnerSubtitle"),
  });
}

export default async function BecomePartnerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppMobileTabPageShell>
      <BecomePartnerView />
    </AppMobileTabPageShell>
  );
}
