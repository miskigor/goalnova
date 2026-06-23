import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExplorePageHeader } from "@/components/explore/ExplorePageHeader";
import { ExploreCrawlLinks } from "@/components/explore/ExploreCrawlLinks";
import { ExploreView } from "@/components/explore/ExploreView";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { GuestPublicCallout } from "@/components/layout/GuestPublicCallout";
import { buildPublicPageMetadata } from "@/lib/seo/buildPublicPageMetadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "explore" });
  return buildPublicPageMetadata({
    locale,
    pathname: "/explore",
    title: `${t("title")} · PitchRusch`,
    description: t("subtitle"),
  });
}

export default async function ExplorePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "explore" });

  return (
    <AppMobileTabPageShell data-pitchrusch-explore-page>
      <GuestPublicCallout />
      <ExploreView
        frameHeader={
          <ExplorePageHeader title={t("title")} subtitle={t("subtitle")} />
        }
      />
      <ExploreCrawlLinks />
    </AppMobileTabPageShell>
  );
}
