"use client";

import { useTranslations } from "next-intl";
import { countryProfileToFlagEmoji } from "@/lib/country/countryFlag";

type Props = {
  rank: number | null;
  displayName: string;
  username?: string | null;
  country?: string | null;
  xp: number;
  highlight?: boolean;
};

export function DailyQuizLeaderboardRow({
  rank,
  displayName,
  username,
  country,
  xp,
  highlight = false,
}: Props) {
  const t = useTranslations("dailyQuiz");
  const flag = countryProfileToFlagEmoji(country);

  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 sm:gap-3 ${
        highlight
          ? "border-gn-accent/40 bg-gn-accent/5"
          : "border-gn-border-subtle bg-gn-surface/40"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
        <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-gn-accent">
          {rank && rank > 0 ? rank : "—"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium leading-snug text-gn-text">
            {flag ? (
              <span className="shrink-0 text-base leading-none" aria-hidden>
                {flag}
              </span>
            ) : null}
            <span className="min-w-0 break-words sm:truncate">{displayName}</span>
          </p>
          {username ? (
            <p className="break-all text-xs text-gn-text-secondary sm:truncate">
              @{username}
            </p>
          ) : null}
        </div>
      </div>
      <span className="shrink-0 text-end text-sm font-semibold tabular-nums text-gn-text">
        {t("weeklyXpShort", { xp })}
      </span>
    </div>
  );
}
