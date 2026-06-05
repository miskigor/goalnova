import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChallengeDetailView } from "@/components/challenges/ChallengeDetailView";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("challengeDetailTitle") };
}

export default async function ChallengeDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const decoded = decodeURIComponent(slug);

  return (
    <AppMobileTabPageShell data-challenges-page>
      <Suspense
        fallback={
          <div
            className="flex min-h-[40vh] items-center justify-center"
            role="status"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
          </div>
        }
      >
        <ChallengeDetailView slug={decoded} />
      </Suspense>
    </AppMobileTabPageShell>
  );
}
