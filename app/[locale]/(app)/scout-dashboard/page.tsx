import type { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScoutDashboardView } from "@/components/scout/ScoutDashboardView";
import { SCOUT_DASHBOARD_PAGE_SHELL_CLASS } from "@/lib/layout/appShellClasses";

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
    <div data-scout-dashboard-page className={SCOUT_DASHBOARD_PAGE_SHELL_CLASS}>
      <ScoutDashboardView />
    </div>
  );
}
