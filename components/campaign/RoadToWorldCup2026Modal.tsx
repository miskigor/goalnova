"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DailyQuizLeaderboardRow } from "@/components/challenges/DailyQuizLeaderboardRow";
import {
  GN_PRIMARY_BUTTON_CLASS,
  GN_SECONDARY_BUTTON_CLASS,
} from "@/components/ui/gnButtonClasses";
import { formatWorldCupCampaignEndDate } from "@/lib/campaign/worldCupCampaignConfig";
import { useWorldCupCampaignStats } from "@/hooks/useWorldCupCampaignStats";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";
import { DAILY_QUIZ_CHALLENGES_HREF } from "@/lib/quiz/dailyQuizNav";
import { rpcQuizWeeklyLeaderboard, type QuizLeaderboardRow } from "@/lib/supabase/dailyQuiz";
import { supabase } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  variant?: "full" | "compact";
};

export function RoadToWorldCup2026Modal({ open, onClose, variant = "full" }: Props) {
  const t = useTranslations("worldCupCampaign");
  const locale = useLocale();
  const titleId = useId();
  const isCompact = variant === "compact";
  const uploadEligibility = useVideoUploadEligibility();
  const { stats, loading } = useWorldCupCampaignStats(open);
  const [leaderboardRows, setLeaderboardRows] = useState<QuizLeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isCompact) return;
    let cancelled = false;

    void (async () => {
      setLeaderboardLoading(true);
      const [{ rows }, session] = await Promise.all([
        rpcQuizWeeklyLeaderboard(locale, 10),
        supabase.auth.getSession(),
      ]);
      if (cancelled) return;
      setLeaderboardRows(rows);
      setCurrentUserId(session.data.session?.user?.id ?? null);
      setLeaderboardLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isCompact, locale]);

  if (!open || typeof document === "undefined") return null;

  const endDate = formatWorldCupCampaignEndDate(locale);
  const canUpload = uploadEligibility === "player";

  const modal = (
    <div
      className="fixed inset-0 z-[100] box-border flex items-end justify-center overflow-x-clip bg-black/75 px-[max(1rem,env(safe-area-inset-left,0px))] pb-[calc(var(--gn-app-bottom-nav-offset,4.5rem)+max(0.75rem,env(safe-area-inset-bottom,0px)))] pe-[max(1rem,env(safe-area-inset-right,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-sm sm:items-center sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="box-border flex max-h-[min(88dvh,720px)] w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-2xl border border-gn-accent/25 bg-gradient-to-b from-gn-surface/95 to-black shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gn-accent/15 text-xl"
              aria-hidden
            >
              🏆
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-bold tracking-tight text-gn-text sm:text-lg">
                {t("title")}
              </h2>
              {!isCompact ? (
                <p className="mt-0.5 text-sm text-gn-text-secondary">{t("subtitle")}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-gn-text-secondary hover:bg-white/5"
          >
            {t("close")}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {isCompact ? (
            <div className="space-y-5">
              <section className="rounded-xl border border-gn-accent/20 bg-gn-accent/10 px-3 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gn-text-tertiary">
                  {t("prizeTitle")}
                </h3>
                <p className="mt-1 text-sm font-semibold text-gn-text">{t("prize")}</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gn-accent">
                  {t("howToEarnTitle")}
                </h3>
                <ul className="space-y-1.5 text-sm text-gn-text-secondary">
                  <li className="flex gap-2">
                    <span className="text-gn-accent" aria-hidden>
                      •
                    </span>
                    {t("earnQuiz")}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gn-accent" aria-hidden>
                      •
                    </span>
                    {t("earnChallenges")}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gn-accent" aria-hidden>
                      •
                    </span>
                    {t("earnUpload")}
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gn-accent">
                  {t("top10Title")}
                </h3>
                {leaderboardLoading ? (
                  <p className="text-sm text-gn-text-secondary">{t("loading")}</p>
                ) : leaderboardRows.length === 0 ? (
                  <p className="text-sm text-gn-text-secondary">{t("top10Empty")}</p>
                ) : (
                  <ol className="space-y-2">
                    {leaderboardRows.map((row) => (
                      <li key={row.user_id}>
                        <DailyQuizLeaderboardRow
                          rank={row.rank}
                          displayName={row.display_name}
                          username={row.username}
                          country={row.country}
                          xp={row.weekly_xp}
                          highlight={Boolean(currentUserId && row.user_id === currentUserId)}
                        />
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gn-text-tertiary">
                  {t("yourRankTitle")}
                </h3>
                {loading ? (
                  <p className="mt-2 text-sm text-gn-text-secondary">{t("loading")}</p>
                ) : !stats.authed ? (
                  <p className="mt-2 text-sm text-gn-text-secondary">{t("guestStatsHint")}</p>
                ) : (
                  <p className="mt-2 text-lg font-bold text-gn-text">
                    {stats.weeklyRank
                      ? t("yourRankValue", { rank: stats.weeklyRank })
                      : t("yourRankUnranked")}
                  </p>
                )}
              </section>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gn-accent">
                  {t("whatIsItTitle")}
                </h3>
                <p className="text-sm leading-relaxed text-gn-text-secondary">{t("whatIsItBody")}</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gn-accent">
                  {t("howToEarnTitle")}
                </h3>
                <ul className="space-y-1.5 text-sm text-gn-text-secondary">
                  <li className="flex gap-2">
                    <span className="text-gn-accent" aria-hidden>
                      •
                    </span>
                    {t("earnQuiz")}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gn-accent" aria-hidden>
                      •
                    </span>
                    {t("earnChallenges")}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gn-accent" aria-hidden>
                      •
                    </span>
                    {t("earnUpload")}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gn-accent" aria-hidden>
                      •
                    </span>
                    {t("earnProfile")}
                  </li>
                </ul>
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gn-accent/20 bg-gn-accent/10 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gn-text-tertiary">
                    {t("prizeTitle")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gn-text">{t("prize")}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gn-text-tertiary">
                    {t("endDateTitle")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gn-text">{endDate}</p>
                </div>
              </div>

              <section className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gn-text-tertiary">
                  {t("yourProgressTitle")}
                </h3>
                {loading ? (
                  <p className="mt-2 text-sm text-gn-text-secondary">{t("loading")}</p>
                ) : !stats.authed ? (
                  <p className="mt-2 text-sm text-gn-text-secondary">{t("guestStatsHint")}</p>
                ) : (
                  <dl className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-gn-text-tertiary">
                        {t("yourXpTitle")}
                      </dt>
                      <dd className="mt-0.5 text-lg font-bold text-gn-accent">
                        {t("yourXpValue", { count: stats.totalXp ?? 0 })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-gn-text-tertiary">
                        {t("yourRankTitle")}
                      </dt>
                      <dd className="mt-0.5 text-lg font-bold text-gn-text">
                        {stats.weeklyRank
                          ? t("yourRankValue", { rank: stats.weeklyRank })
                          : t("yourRankUnranked")}
                      </dd>
                    </div>
                  </dl>
                )}
              </section>
            </div>
          )}
        </div>

        {!isCompact ? (
          <div className="shrink-0 space-y-2 border-t border-white/10 px-4 py-4 sm:px-5">
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href={DAILY_QUIZ_CHALLENGES_HREF}
                onClick={onClose}
                className={`${GN_PRIMARY_BUTTON_CLASS} w-full justify-center text-sm`}
              >
                {t("ctaQuiz")}
              </Link>
              {canUpload ? (
                <Link
                  href="/upload"
                  onClick={onClose}
                  className={`${GN_SECONDARY_BUTTON_CLASS} w-full justify-center text-sm`}
                >
                  {t("ctaUpload")}
                </Link>
              ) : (
                <Link
                  href="/challenges"
                  onClick={onClose}
                  className={`${GN_SECONDARY_BUTTON_CLASS} w-full justify-center text-sm`}
                >
                  {t("ctaChallenges")}
                </Link>
              )}
            </div>
            <Link
              href="/settings/profile"
              onClick={onClose}
              className="block text-center text-xs font-medium text-gn-accent hover:underline"
            >
              {t("ctaProfile")}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
