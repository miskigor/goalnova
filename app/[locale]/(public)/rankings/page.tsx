import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RankingsView } from "@/components/rankings/RankingsView";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rankings" });
  return { title: t("title") };
}

export default async function RankingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
      <RankingsView />
    </div>
  );
}
