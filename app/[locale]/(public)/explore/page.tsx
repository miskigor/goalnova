import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExploreView } from "@/components/explore/ExploreView";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { GuestPublicCallout } from "@/components/layout/GuestPublicCallout";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("exploreTitle") };
}

export default async function ExplorePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppMobileTabPageShell data-pitchrusch-explore-page>
      <GuestPublicCallout />
      <ExploreView />
    </AppMobileTabPageShell>
  );
}
