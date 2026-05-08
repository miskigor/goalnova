import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlayerSearchView } from "@/components/search/PlayerSearchView";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("searchTitle") };
}

export default async function SearchPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
      <PlayerSearchView />
    </div>
  );
}
