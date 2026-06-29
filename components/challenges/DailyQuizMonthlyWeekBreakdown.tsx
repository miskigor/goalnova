"use client";

import { useLocale, useTranslations } from "next-intl";
import type { QuizMonthlyWeekRow } from "@/lib/supabase/dailyQuiz";

type Props = {
  weeks: QuizMonthlyWeekRow[];
  monthlyXp: number;
};

function formatWeekRange(
  weekStart: string,
  weekEnd: string,
  locale: string,
): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(`${weekEnd}T12:00:00`);
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export function DailyQuizMonthlyWeekBreakdown({ weeks, monthlyXp }: Props) {
  const t = useTranslations("dailyQuiz");
  const locale = useLocale();

  if (weeks.length === 0) return null;

  return (
    <section
      className="box-border min-w-0 w-full max-w-full space-y-3 overflow-x-clip rounded-2xl border border-gn-border-subtle bg-gn-surface/25 p-4"
      aria-label={t("monthlyBreakdownTitle")}
    >
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-gn-text-tertiary">
          {t("monthlyBreakdownTitle")}
        </h3>
        <p className="text-right text-sm font-semibold text-gn-accent">
          {t("monthlyTotalHint", { xp: monthlyXp })}
        </p>
      </div>
      <p className="text-xs text-gn-text-secondary">{t("monthlyBreakdownHint")}</p>
      <ol className="space-y-2">
        {weeks.map((week) => (
          <li
            key={`${week.week_start}-${week.week_index}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-gn-border-subtle/80 bg-gn-surface/40 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gn-text">
                {t("monthlyWeekLabel", { week: week.week_index })}
              </p>
              <p className="text-[11px] text-gn-text-tertiary">
                {formatWeekRange(week.week_start, week.week_end, locale)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-bold text-gn-text">
              {t("weeklyXpShort", { xp: week.xp })}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
