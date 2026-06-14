"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChallengesHub } from "@/components/challenges/ChallengesHub";
import { DailyQuizSection } from "@/components/challenges/DailyQuizSection";
import { RoadToWorldCup2026ChallengesButton } from "@/components/campaign/RoadToWorldCup2026ChallengesButton";
import { DailyQuizPendingDot } from "@/components/quiz/DailyQuizPendingDot";
import { useDailyQuizStatus } from "@/hooks/useDailyQuizStatus";

type ChallengesTab = "challenges" | "quiz";

function challengesTabClass(active: boolean, variant: ChallengesTab): string {
  const base = "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition";

  if (active) {
    if (variant === "quiz") {
      return `${base} bg-gn-accent text-black shadow-[0_4px_16px_-4px_rgba(249,115,22,0.45)] ring-1 ring-white/10`;
    }
    return `${base} bg-gn-accent/20 text-gn-accent ring-1 ring-gn-accent/40`;
  }

  return `${base} border border-white/15 bg-gn-surface/55 text-gn-text hover:border-white/25 hover:bg-gn-surface-elevated/60`;
}

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
          className={challengesTabClass(tab === "challenges", "challenges")}
        >
          {t("tabChallenges")}
        </Link>
        <Link
          href={challengesTabHref("quiz")}
          role="tab"
          aria-selected={tab === "quiz"}
          className={`relative ${challengesTabClass(tab === "quiz", "quiz")}`}
        >
          <span className="inline-flex items-center gap-2">
            {t("tabQuiz")}
            {quizPending ? <DailyQuizPendingDot /> : null}
          </span>
        </Link>
      </div>
      <RoadToWorldCup2026ChallengesButton />
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
        <span className={challengesTabClass(true, "challenges")}>
          {t("tabChallenges")}
        </span>
        <span className={challengesTabClass(false, "quiz")}>
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
