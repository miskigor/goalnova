import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { ScoutApplyForm } from "@/components/scout/ScoutApplyForm";
import { ScoutApplyPageHeader } from "@/components/scout/ScoutApplyPageHeader";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("scoutApplyTitle") };
}

export default async function ScoutApplyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppMobileTabPageShell
      data-scout-apply-page
      className="sm:max-w-lg"
    >
      <ScoutApplyPageHeader />
      <ScoutApplyForm />
    </AppMobileTabPageShell>
  );
}
