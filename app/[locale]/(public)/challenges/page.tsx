import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChallengesHub } from "@/components/challenges/ChallengesHub";
import { ChallengesPageHeader } from "./ChallengesPageHeader";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "challenges" });
  return { title: t("title") };
}

export default async function ChallengesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto box-border w-full max-w-[min(100%,22rem)] px-3 py-6 sm:max-w-4xl sm:px-5 sm:py-8">
      <ChallengesPageHeader />
      <ChallengesHub />
    </div>
  );
}
