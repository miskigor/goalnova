"use client";

import { useTranslations } from "next-intl";
import { DailyQuizLeaderboardRow } from "@/components/challenges/DailyQuizLeaderboardRow";
import type { QuizMonthlyLeaderboardRow } from "@/lib/supabase/dailyQuiz";

type Props = {
  rows: QuizMonthlyLeaderboardRow[];
  loading?: boolean;
  currentUserId?: string | null;
};

export function DailyQuizMonthlyLeaderboard({
  rows,
  loading = false,
  currentUserId = null,
}: Props) {
  const t = useTranslations("dailyQuiz");

  return (
    <section
      className="box-border min-w-0 w-full max-w-full space-y-3 overflow-x-clip rounded-2xl border border-gn-border-subtle bg-gn-surface/25 p-4"
      aria-label={t("monthlyLeaderboardTitle")}
    >
      <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-gn-text-tertiary">
        {t("monthlyLeaderboardTitle")}
      </h3>
      {loading ? (
        <p className="text-sm text-gn-text-secondary">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gn-text-secondary">{t("monthlyLeaderboardEmpty")}</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row) => (
            <li key={row.user_id}>
              <DailyQuizLeaderboardRow
                rank={row.rank}
                displayName={row.display_name}
                username={row.username}
                country={row.country}
                xp={row.monthly_xp}
                highlight={Boolean(currentUserId && row.user_id === currentUserId)}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
