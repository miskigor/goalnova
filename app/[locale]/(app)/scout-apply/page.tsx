import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScoutApplyForm } from "@/components/scout/ScoutApplyForm";

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
    <div className="mx-auto w-full min-w-0 max-w-full space-y-4 overflow-x-clip pb-8 sm:space-y-6 sm:pb-10">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold leading-snug tracking-tight text-gn-text break-words sm:text-2xl sm:leading-tight">
          {t("pageTitle")}
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-gn-text-secondary break-words sm:text-sm">
          {t("pageSubtitle")}
        </p>
      </div>
      <ScoutApplyForm />
    </div>
  );
}
