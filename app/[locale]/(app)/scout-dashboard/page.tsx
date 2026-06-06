import type { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { ScoutDashboardView } from "@/components/scout/ScoutDashboardView";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("scoutDashboardTitle"), robots: PRIVATE_PAGE_ROBOTS };
}

export default async function ScoutDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AppMobileTabPageShell
      data-scout-dashboard-page
      className="sm:max-w-lg lg:max-w-4xl"
    >
      <ScoutDashboardView />
    </AppMobileTabPageShell>
  );
}
