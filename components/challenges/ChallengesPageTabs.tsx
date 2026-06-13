"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChallengesHub } from "@/components/challenges/ChallengesHub";
import { DailyQuizSection } from "@/components/challenges/DailyQuizSection";
import { DailyQuizPendingDot } from "@/components/quiz/DailyQuizPendingDot";
import { useDailyQuizStatus } from "@/hooks/useDailyQuizStatus";

type ChallengesTab = "challenges" | "quiz";

function resolveChallengesTab(
  searchParams: Pick<URLSearchParams, "get">,
): ChallengesTab {
  return searchParams.get("tab") === "quiz" ? "quiz" : "challenges";
}

function challengesTabHref(
  tab: ChallengesTab,
): "/challenges" | "/challenges?tab=quiz" {
  return tab === "quiz" ? "/challenges?tab=quiz" : "/challenges";
}

export function ChallengesPageTabs() {
  const t = useTranslations("dailyQuiz");
  const searchParams = useSearchParams();
  const tab = useMemo(() => resolveChallengesTab(searchParams), [searchParams]);
  const { pending: quizPending } = useDailyQuizStatus();

  return (
    <>
      <div
        className="flex min-w-0 gap-2 overflow-x-auto border-b border-gn-border-subtle pb-3"
        role="tablist"
        aria-label={t("tabsAria")}
      >
        <Link
          href={challengesTabHref("challenges")}
          role="tab"
          aria-selected={tab === "challenges"}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${
            tab === "challenges"
              ? "bg-gn-accent text-black"
              : "border border-gn-border-subtle text-gn-text-secondary hover:text-gn-text"
          }`}
        >
          {t("tabChallenges")}
        </Link>
        <Link
          href={challengesTabHref("quiz")}
          role="tab"
          aria-selected={tab === "quiz"}
          className={`relative shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${
            tab === "quiz"
              ? "bg-gn-accent text-black"
              : "border border-gn-border-subtle text-gn-text-secondary hover:text-gn-text"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {t("tabQuiz")}
            {quizPending ? <DailyQuizPendingDot /> : null}
          </span>
        </Link>
      </div>
      {tab === "quiz" ? <DailyQuizSection /> : <ChallengesHub />}
    </>
  );
}

export function ChallengesPageTabsFallback() {
  const t = useTranslations("dailyQuiz");

  return (
    <>
      <div
        className="flex min-w-0 gap-2 overflow-x-auto border-b border-gn-border-subtle pb-3"
        role="tablist"
        aria-label={t("tabsAria")}
      >
        <span className="shrink-0 rounded-xl bg-gn-accent px-4 py-2 text-sm font-medium text-black">
          {t("tabChallenges")}
        </span>
        <span className="shrink-0 rounded-xl border border-gn-border-subtle px-4 py-2 text-sm font-medium text-gn-text-secondary">
          {t("tabQuiz")}
        </span>
      </div>
      <div
        className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-gn-text-secondary"
        role="status"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
        {t("loading")}
      </div>
    </>
  );
}
