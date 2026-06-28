import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ClubDashboardView } from "@/components/clubs/ClubDashboardView";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";

type Props = { params: Promise<{ locale: string }> };

export default async function ClubDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppMobileTabPageShell>
      <Suspense fallback={null}>
        <ClubDashboardView />
      </Suspense>
    </AppMobileTabPageShell>
  );
}
