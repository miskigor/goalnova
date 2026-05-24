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
    <div className="mx-auto box-border w-full min-w-0 max-w-full touch-pan-y overflow-x-clip px-3 py-5 sm:px-4 sm:py-8 lg:max-w-6xl lg:px-5 lg:py-8">
      <ExploreView />
    </div>
  );
}
