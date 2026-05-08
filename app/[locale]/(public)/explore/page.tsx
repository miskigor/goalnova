import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExploreView } from "@/components/explore/ExploreView";

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
    <div className="mx-auto box-border w-full min-w-0 max-w-6xl touch-pan-y overflow-x-clip px-2 py-5 sm:px-5 sm:py-8">
      <ExploreView />
    </div>
  );
}
