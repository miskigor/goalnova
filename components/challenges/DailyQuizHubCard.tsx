"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DAILY_QUIZ_CHALLENGES_HREF } from "@/lib/quiz/dailyQuizNav";
import { QUIZ_CORRECT_XP } from "@/lib/quiz/quizConfig";
import { useDailyQuizStatus } from "@/hooks/useDailyQuizStatus";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

const CATEGORY_KEYS = [
  "world_cup",
  "champions_league",
  "football_rules",
  "legends",
  "current_football",
] as const;

function categoryLabelKey(category: string | null): (typeof CATEGORY_KEYS)[number] | null {
  if (category && (CATEGORY_KEYS as readonly string[]).includes(category)) {
    return category as (typeof CATEGORY_KEYS)[number];
  }
  return null;
}

function truncateQuestion(text: string, max = 96): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

export function DailyQuizHubCard() {
  const t = useTranslations("dailyQuiz");
  const {
    loading,
    authed,
    hasQuestion,
    pending,
    streak,
    questionText,
    category,
  } = useDailyQuizStatus();

  if (loading) {
    return (
      <div
        className="h-[5.5rem] animate-pulse rounded-2xl border border-gn-border-subtle bg-gn-surface/30"
        role="status"
        aria-label={t("loading")}
      />
    );
  }

  if (!hasQuestion) return null;

  const catKey = categoryLabelKey(category);
  const preview = questionText ? truncateQuestion(questionText) : null;

  return (
    <Link
      href={DAILY_QUIZ_CHALLENGES_HREF}
      className="group block rounded-2xl border border-gn-accent/30 bg-gradient-to-br from-gn-accent/12 via-gn-surface/40 to-gn-surface/25 p-4 transition hover:border-gn-accent/45 hover:from-gn-accent/16 sm:p-5"
      aria-label={pending ? t("hubCardPendingAria") : t("hubCardAnsweredAria")}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gn-accent/15 text-xl"
          aria-hidden
        >
          ⚽
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold tracking-tight text-gn-text">
              {t("hubCardTitle")}
            </p>
            {catKey ? (
              <span className="rounded-lg border border-gn-accent/30 bg-gn-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gn-accent">
                {t(`category_${catKey}`)}
              </span>
            ) : null}
            {pending ? (
              <span className="rounded-lg bg-gn-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
                {t("hubCardNewBadge")}
              </span>
            ) : null}
          </div>

          {preview ? (
            <p className="line-clamp-2 text-sm leading-snug text-gn-text-secondary group-hover:text-gn-text">
              {preview}
            </p>
          ) : null}

          <p className="text-xs text-gn-text-tertiary">
            {!authed
              ? t("hubCardGuestBody", { xp: QUIZ_CORRECT_XP })
              : pending
                ? t("hubCardPendingBody", { xp: QUIZ_CORRECT_XP })
                : t("hubCardAnsweredBody", { streak })}
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <span
          className={`${GN_PRIMARY_BUTTON_CLASS} pointer-events-none inline-flex min-h-9 px-4 py-2 text-xs sm:text-sm`}
        >
          {!authed ? t("hubCardGuestCta") : pending ? t("hubCardPendingCta") : t("hubCardAnsweredCta")}
        </span>
      </div>
    </Link>
  );
}
