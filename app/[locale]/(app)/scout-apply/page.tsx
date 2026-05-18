import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScoutApplyForm } from "@/components/scout/ScoutApplyForm";
import { SCOUT_APPLY_PAGE_SHELL_CLASS } from "@/lib/layout/appShellClasses";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("scoutApplyTitle") };
}

export default async function ScoutApplyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("scoutVerification");

  return (
    <div
      data-scout-apply-page
      className={`${SCOUT_APPLY_PAGE_SHELL_CLASS} space-y-4 pb-8 sm:space-y-6 sm:pb-10`}
    >
      <header className="min-w-0 max-w-full">
        <h1 className="break-words text-lg font-semibold leading-snug tracking-tight text-gn-text sm:text-2xl sm:leading-tight">
          {t("pageTitle")}
        </h1>
        <p className="mt-1.5 break-words text-xs leading-relaxed text-gn-text-secondary sm:text-sm">
          {t("pageSubtitle")}
        </p>
      </header>
      <ScoutApplyForm />
    </div>
  );
}
