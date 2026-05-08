"use client";

import { useTranslations } from "next-intl";
import type { ChallengeRow } from "@/lib/challenges/challengeRowUtils";
import {
  challengeRewardDescription,
  challengeRewardHeadline,
  challengeRewardImageUrl,
  normalizeRewardType,
  type RewardType,
} from "@/lib/challenges/challengeReward";

type Props = { challenge: ChallengeRow; variant?: "hero" | "compact" };

function rewardTypeLabel(
  t: ReturnType<typeof useTranslations>,
  type: RewardType,
): string {
  const m: Record<RewardType, string> = {
    gear: t("rewardTypeGear"),
    digital: t("rewardTypeDigital"),
    cash: t("rewardTypeCash"),
    feature: t("rewardTypeFeature"),
    recognition: t("rewardTypeRecognition"),
    other: t("rewardTypeOther"),
  };
  return m[type];
}

export function ChallengeRewardBanner({ challenge, variant = "hero" }: Props) {
  const t = useTranslations("challenges");
  const headline = challengeRewardHeadline(challenge);
  const body = challengeRewardDescription(challenge);
  const img = challengeRewardImageUrl(challenge);
  const type = normalizeRewardType(challenge.reward_type);

  if (!headline && !body && !img) return null;

  const isHero = variant === "hero";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-500/[0.14] via-gn-accent/[0.08] to-transparent shadow-[0_0_40px_rgba(251,191,36,0.12)] ring-1 ring-amber-400/20 ${
        isHero ? "p-5 sm:p-6" : "p-4"
      }`}
    >
      <div className="pointer-events-none absolute -end-8 -top-10 size-40 rounded-full bg-amber-400/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -start-6 size-32 rounded-full bg-gn-accent/10 blur-2xl" />

      <div
        className={`relative flex flex-col gap-4 ${img ? "sm:flex-row sm:items-start" : ""}`}
      >
        {img ? (
          <div
            className={`relative shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 ${
              isHero ? "mx-auto size-28 sm:mx-0 sm:size-32" : "mx-auto size-20 sm:mx-0 sm:size-24"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- reward URLs are admin-supplied arbitrary hosts */}
            <img src={img} alt="" className="size-full object-cover" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-start">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="rounded-full bg-amber-400/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-black">
              {t("rewardPrizeLabel")}
            </span>
            {type ? (
              <span className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100/90">
                {rewardTypeLabel(t, type)}
              </span>
            ) : null}
          </div>
          {headline ? (
            <p
              className={`font-bold tracking-tight text-white ${
                isHero ? "text-xl sm:text-2xl" : "text-lg"
              }`}
            >
              {headline}
            </p>
          ) : null}
          {body ? (
            <p className="text-sm leading-relaxed text-white/85">{body}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
