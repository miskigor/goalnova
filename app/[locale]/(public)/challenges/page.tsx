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
    <div className="box-border w-full min-w-0 max-w-full overflow-x-clip pt-6 pb-[calc(var(--gn-app-bottom-nav-offset)+2rem)] sm:mx-auto sm:max-w-4xl sm:px-5 sm:pt-8 lg:py-8">
      <ChallengesPageHeader />
      <ChallengesHub />
    </div>
  );
}
