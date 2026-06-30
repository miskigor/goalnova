"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { challengeLinkSegment } from "@/lib/challenges/challengeRowUtils";
import {
  fetchAllChallengesOrdered,
  fetchVideoCountsByChallengeId,
  type ChallengeRow,
} from "@/lib/supabase/challenges";
import { ChallengeHubCard } from "@/components/challenges/ChallengeHubCard";
import { DailyQuizHubCard } from "@/components/challenges/DailyQuizHubCard";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  GN_PRIMARY_BUTTON_CLASS,
  GN_SECONDARY_BUTTON_CLASS,
} from "@/components/ui/gnButtonClasses";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";
import { withLocalizedChallengeContent } from "@/lib/challenges/challengeContent";
import { resetMlv2ScrollPosition } from "@/lib/layout/mlv2ScrollReset";

function sortByNewestFirst(rows: ChallengeRow[]): ChallengeRow[] {
  return [...rows].sort((a, b) => {
    const ta = Date.parse(a.created_at);
    const tb = Date.parse(b.created_at);
    if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta;
    return a.title.localeCompare(b.title);
  });
}

export function ChallengesHub() {
  const t = useTranslations("challenges");
  const locale = useLocale();
  const uploadEligibility = useVideoUploadEligibility();

  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryBusy, setRetryBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    const { challenges: list, error: chErr } = await fetchAllChallengesOrdered();
    if (chErr) {
      logFullSupabaseError("[ChallengesHub] fetchAllChallengesOrdered", new Error(chErr));
      setLoadFailed(true);
      setChallenges([]);
      setLoading(false);
      setRetryBusy(false);
      return;
    }
    setChallenges(list);
    const countMap = await fetchVideoCountsByChallengeId(list.map((c) => c.id));
    setCounts(countMap);
    setLoading(false);
    setRetryBusy(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { activeSorted, pastSorted } = useMemo(() => {
    const active: ChallengeRow[] = [];
    const past: ChallengeRow[] = [];
    for (const c of challenges) {
      if (c.status === "active") active.push(c);
      else if (c.status === "ended") past.push(c);
    }
    return {
      activeSorted: sortByNewestFirst(active),
      pastSorted: sortByNewestFirst(past),
    };
  }, [challenges]);

  if (loading) {
    return (
      <div className="box-border min-w-0 w-full max-w-full space-y-6 overflow-x-clip sm:space-y-8">
        <DailyQuizHubCard />
        <div
          className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-gn-text-secondary"
          role="status"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
          {t("loading")}
        </div>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="box-border min-w-0 w-full max-w-full space-y-6 overflow-x-clip sm:space-y-8">
        <DailyQuizHubCard />
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-950/25 px-4 py-6 text-center"
        >
        <p className="text-sm font-medium text-red-100">{t("errorTitle")}</p>
        <p className="mt-1 text-sm text-red-100/85">{t("errorBody")}</p>
        <button
          type="button"
          disabled={retryBusy}
          aria-busy={retryBusy}
          onClick={() => {
            setRetryBusy(true);
            void load();
          }}
          className="mt-4 rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {retryBusy ? t("retrying") : t("retry")}
        </button>
        </div>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="box-border min-w-0 w-full max-w-full space-y-6 overflow-x-clip sm:space-y-8">
        <DailyQuizHubCard />
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/25 px-6 py-12 text-center sm:px-10">
        <p className="text-sm font-medium text-gn-text">{t("emptyTitle")}</p>
        <p className="mt-2 text-sm text-gn-text-secondary">{t("emptyBody")}</p>
        <div className="mx-auto mt-8 flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/explore"
            className={`${GN_SECONDARY_BUTTON_CLASS} w-full justify-center`}
          >
            {t("emptyExploreCta")}
          </Link>
          {uploadEligibility === "player" ? (
            <Link
              href="/upload"
              className={`${GN_PRIMARY_BUTTON_CLASS} w-full justify-center`}
            >
              {t("emptyUploadCta")}
            </Link>
          ) : null}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="box-border min-w-0 w-full max-w-full space-y-6 overflow-x-clip sm:space-y-8">
      <DailyQuizHubCard />
      {activeSorted.length > 0 ? (
        <section
          className="box-border min-w-0 w-full max-w-full space-y-3 overflow-x-clip"
          aria-label={t("activeChallengesHeading")}
        >
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-gn-text-tertiary">
            {t("activeChallengesHeading")}
          </h2>
          <ul className="box-border flex min-w-0 w-full max-w-full flex-col gap-3 overflow-x-clip">
            {activeSorted.map((c) => {
              const displayChallenge = withLocalizedChallengeContent(c, t, locale);
              const href = `/challenges/${encodeURIComponent(challengeLinkSegment(c))}` as const;
              return (
                <li key={c.id} className="box-border min-w-0 w-full max-w-full">
                  <ChallengeHubCard
                    challenge={displayChallenge}
                    videoCount={counts.get(c.id) ?? 0}
                    href={href}
                    variant="active"
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {pastSorted.length > 0 ? (
        <section
          className="box-border min-w-0 w-full max-w-full space-y-3 overflow-x-clip"
          aria-label={t("pastChallengesHeading")}
        >
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-gn-text-tertiary">
            {t("pastChallengesHeading")}
          </h2>
          <ul className="box-border flex min-w-0 w-full max-w-full flex-col gap-3 overflow-x-clip">
            {pastSorted.map((c) => {
              const displayChallenge = withLocalizedChallengeContent(c, t, locale);
              const href = `/challenges/${encodeURIComponent(challengeLinkSegment(c))}` as const;
              return (
                <li key={c.id} className="box-border min-w-0 w-full max-w-full">
                  <ChallengeHubCard
                    challenge={displayChallenge}
                    videoCount={counts.get(c.id) ?? 0}
                    href={href}
                    variant="past"
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
