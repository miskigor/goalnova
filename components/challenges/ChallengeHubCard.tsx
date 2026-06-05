"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { challengeRewardHeadline } from "@/lib/challenges/challengeReward";
import { timeRemainingUntil } from "@/lib/challenges/challengeTime";
import type { ChallengeRow } from "@/lib/supabase/challenges";

type Props = {
  challenge: ChallengeRow;
  videoCount: number;
  href: `/challenges/${string}`;
  variant?: "active" | "past";
};

export function ChallengeHubCard({
  challenge,
  videoCount,
  href,
  variant = "active",
}: Props) {
  const t = useTranslations("challenges");
  const rewardLine = challengeRewardHeadline(challenge);
  const timeLeft = timeRemainingUntil(challenge.expires_at);
  const isPast = variant === "past" || challenge.status === "ended";

  return (
    <Link
      href={href}
      className="group box-border flex min-w-0 w-full max-w-full items-stretch gap-3 overflow-hidden rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-3.5 transition-colors hover:border-gn-accent/30 hover:bg-gn-surface/45 active:scale-[0.99] sm:px-5 sm:py-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h2 className="min-w-0 flex-1 break-words text-base font-semibold leading-snug text-gn-text group-hover:text-gn-accent sm:text-lg">
            {challenge.title}
          </h2>
          {isPast ? (
            <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gn-text-tertiary">
              {t("statusEnded")}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300/95">
              {t("statusLive")}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gn-text-secondary">
          {!isPast && timeLeft && !timeLeft.expired ? (
            <span className="font-medium text-gn-accent">
              {t("timeRemaining", { time: timeLeft.label })}
            </span>
          ) : null}
          {rewardLine ? (
            <span className="min-w-0 break-words text-amber-100/90">
              {t("reward")}: {rewardLine}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-gn-text-tertiary">
          {t("videoCount", {
            count: videoCount,
            video: t("video"),
            videos: t("videos"),
          })}
        </p>
      </div>
      <span
        className="flex shrink-0 items-center text-lg text-gn-text-tertiary transition-colors group-hover:text-gn-accent"
        aria-hidden
      >
        ›
      </span>
    </Link>
  );
}
