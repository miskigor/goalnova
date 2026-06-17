"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  rpcQuizGetToday,
  rpcQuizSubmitAnswer,
  rpcQuizWeeklyLeaderboard,
  type QuizLeaderboardRow,
  type QuizTodayPayload,
} from "@/lib/supabase/dailyQuiz";
import { DailyQuizLeaderboardRow } from "@/components/challenges/DailyQuizLeaderboardRow";
import { DailyQuizWeeklyLeaderboard } from "@/components/challenges/DailyQuizWeeklyLeaderboard";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { QUIZ_CORRECT_XP } from "@/lib/quiz/quizConfig";
import { notifyDailyQuizStatusChanged } from "@/lib/quiz/dailyQuizStatusEvents";
import { invalidateDailyQuizStatusSnapshot } from "@/lib/quiz/fetchDailyQuizStatusSnapshot";
import { getQuizZagrebTodayIso } from "@/lib/quiz/quizZagrebDate";
import { supabase } from "@/lib/supabase/client";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";

const CATEGORY_KEYS = [
  "world_cup",
  "champions_league",
  "football_rules",
  "legends",
  "current_football",
] as const;

const CATEGORY_EMOJI: Record<(typeof CATEGORY_KEYS)[number], string> = {
  world_cup: "🌍",
  champions_league: "🏆",
  football_rules: "📖",
  legends: "⭐",
  current_football: "🔥",
};

function categoryLabelKey(category: string): (typeof CATEGORY_KEYS)[number] | null {
  if ((CATEGORY_KEYS as readonly string[]).includes(category)) {
    return category as (typeof CATEGORY_KEYS)[number];
  }
  return null;
}

export function DailyQuizSection() {
  const t = useTranslations("dailyQuiz");
  const locale = useLocale();
  const uploadEligibility = useVideoUploadEligibility();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [payload, setPayload] = useState<QuizTodayPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<QuizLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: session } = await supabase.auth.getSession();
    const isAuthed = Boolean(session.session?.user);
    setAuthed(isAuthed);
    setUserId(session.session?.user?.id ?? null);

    const { data, error: loadErr } = await rpcQuizGetToday(locale);
    if (loadErr) {
      setError(loadErr);
      setPayload(null);
    } else {
      setPayload(data);
    }
    setLoading(false);

    if (isAuthed) {
      setLeaderboardLoading(true);
      const { rows } = await rpcQuizWeeklyLeaderboard(locale, 10);
      setLeaderboard(rows);
      setLeaderboardLoading(false);
    } else {
      setLeaderboard([]);
      setLeaderboardLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const reloadIfStale = () => {
      const today = getQuizZagrebTodayIso();
      if (payload?.quiz_date && payload.quiz_date !== today) {
        invalidateDailyQuizStatusSnapshot();
        void load();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reloadIfStale();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(reloadIfStale, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(timer);
    };
  }, [load, payload?.quiz_date]);

  async function onSelectOption(index: number) {
    if (!authed || submitting || payload?.already_answered) return;
    setSubmitting(true);
    setError(null);
    const { data, error: submitErr } = await rpcQuizSubmitAnswer(index, locale);
    setSubmitting(false);
    if (submitErr) {
      setError(submitErr.includes("already_answered") ? t("alreadyAnswered") : submitErr);
      await load();
      return;
    }
    if (!data) return;
    setPayload((prev) => {
      if (!prev?.question) return prev;
      return {
        ...prev,
        already_answered: true,
        answer: {
          selected_option_index: data.selected_option_index,
          is_correct: data.is_correct,
          xp_awarded: data.xp_awarded,
          correct_option_index: data.correct_option_index,
          correct_option_text: data.correct_option_text,
        },
        current_streak: data.current_streak,
        total_quiz_xp: data.total_quiz_xp,
        weekly_xp: data.weekly_xp,
        weekly_rank: data.weekly_rank,
      };
    });
    const { rows } = await rpcQuizWeeklyLeaderboard(locale, 10);
    setLeaderboard(rows);
    invalidateDailyQuizStatusSnapshot();
    notifyDailyQuizStatusChanged();
  }

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-gn-text-secondary"
        role="status"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
        {t("loading")}
      </div>
    );
  }

  if (error && !payload?.question) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-500/40 bg-red-950/25 px-4 py-6 text-center"
      >
        <p className="text-sm text-red-100">{t("errorTitle")}</p>
        <p className="mt-1 text-sm text-red-100/85">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-black"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const question = payload?.question;
  const answer = payload?.answer;
  const catKey = question ? categoryLabelKey(question.category) : null;
  const viewer = payload?.viewer;
  const inLeaderboard = userId
    ? leaderboard.some((row) => row.user_id === userId)
    : false;
  const showSelfRankRow =
    authed &&
    viewer &&
    userId &&
    !inLeaderboard &&
    (payload?.already_answered || (payload?.weekly_rank ?? 0) > 0);

  return (
    <div className="box-border min-w-0 w-full max-w-full space-y-5 overflow-x-clip">
      <div className="space-y-1">
        <h2 className="text-lg font-bold tracking-tight text-gn-text sm:text-xl">
          {t("questionOfTheDay")}
        </h2>
        <p className="text-xs text-gn-text-secondary">{t("subtitle")}</p>
      </div>

      {question ? (
        <div className="space-y-4 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4 sm:p-5">
          {catKey ? (
            <div
              className="inline-flex max-w-full items-center gap-2 rounded-xl border border-gn-accent/35 bg-gn-accent/10 px-3 py-1.5"
              role="status"
            >
              <span className="shrink-0 text-base leading-none" aria-hidden>
                {CATEGORY_EMOJI[catKey]}
              </span>
              <span className="min-w-0 break-words text-sm font-bold tracking-tight text-gn-accent">
                {t(`category_${catKey}`)}
              </span>
            </div>
          ) : null}
          {authed && !payload?.already_answered ? (
            <p className="text-sm font-semibold text-emerald-300/95">
              {t("correctRewardHint", { xp: QUIZ_CORRECT_XP })}
            </p>
          ) : null}
          <p className="break-words text-base font-medium leading-relaxed text-gn-text sm:text-lg">
            {question.question_text}
          </p>

          {authed === false ? (
            <div className="space-y-3 rounded-xl border border-gn-border-subtle bg-gn-surface/30 p-4 text-center">
              <p className="text-sm text-gn-text-secondary">{t("signInToPlay")}</p>
              <Link
                href="/login"
                className={`${GN_PRIMARY_BUTTON_CLASS} inline-flex justify-center`}
              >
                {t("signInCta")}
              </Link>
            </div>
          ) : null}

          {authed && !payload?.already_answered ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {question.options.map((opt, idx) => (
                <button
                  key={`${question.id}-opt-${idx}`}
                  type="button"
                  disabled={submitting}
                  onClick={() => void onSelectOption(idx)}
                  className="min-h-11 min-w-0 break-words rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-4 py-3 text-start text-sm font-medium leading-snug text-gn-text transition hover:border-gn-accent/40 hover:bg-gn-surface-elevated disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : null}

          {authed && payload?.already_answered && answer ? (
            <div
              className={`rounded-xl border px-4 py-3 ${
                answer.is_correct
                  ? "border-emerald-500/40 bg-emerald-950/20"
                  : "border-red-500/35 bg-red-950/20"
              }`}
              role="status"
            >
              {answer.is_correct ? (
                <p className="text-sm font-semibold text-emerald-200">
                  {t("correctResult", { xp: answer.xp_awarded })}
                </p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-red-200">{t("wrongResult")}</p>
                  <p className="mt-1 text-sm text-gn-text-secondary">
                    {t("correctWas", { answer: answer.correct_option_text })}
                  </p>
                </>
              )}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-gn-text-secondary">{t("noQuestion")}</p>
      )}

      {authed ? (
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-3 text-center sm:gap-3 sm:p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gn-text-tertiary">
              {t("streakLabel")}
            </p>
            <p className="mt-1 text-lg font-bold text-gn-text">
              {payload?.current_streak ?? 0}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gn-text-tertiary">
              {t("weeklyXpLabel")}
            </p>
            <p className="mt-1 text-lg font-bold text-gn-text">
              {payload?.weekly_xp ?? 0}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gn-text-tertiary">
              {t("weeklyRankLabel")}
            </p>
            <p className="mt-1 text-lg font-bold text-gn-text">
              {(payload?.weekly_rank ?? 0) > 0
                ? t("rankValue", { rank: payload?.weekly_rank ?? 0 })
                : "—"}
            </p>
          </div>
        </div>
      ) : null}

      {showSelfRankRow && viewer ? (
        <section className="space-y-2" aria-label={t("yourRankLabel")}>
          <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-gn-text-tertiary">
            {t("yourRankLabel")}
          </h3>
          <DailyQuizLeaderboardRow
            rank={payload?.weekly_rank ?? null}
            displayName={viewer.display_name}
            username={viewer.username}
            country={viewer.country}
            weeklyXp={payload?.weekly_xp ?? 0}
            highlight
          />
        </section>
      ) : null}

      {authed ? (
        <DailyQuizWeeklyLeaderboard
          rows={leaderboard}
          loading={leaderboardLoading}
          currentUserId={userId}
        />
      ) : null}

      {uploadEligibility === "player" ? (
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/25 px-4 py-4 text-center">
          <p className="text-sm font-medium text-gn-text-secondary">{t("uploadCtaBody")}</p>
          <Link
            href="/upload"
            className={`${GN_PRIMARY_BUTTON_CLASS} mt-3 inline-flex justify-center`}
          >
            {t("uploadCtaButton")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
