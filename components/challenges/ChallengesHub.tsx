"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMediaNearViewport } from "@/lib/video/useMediaNearViewport";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { challengeLinkSegment } from "@/lib/challenges/challengeRowUtils";
import {
  fetchAllChallengesOrdered,
  fetchBestAiHighlightsForChallenges,
  fetchTopVideosForChallenge,
  fetchVideoCountsByChallengeId,
  type ChallengeAiHighlight,
  type ChallengeRow,
  type ChallengeTopPreview,
} from "@/lib/supabase/challenges";
import { challengeRewardHeadline } from "@/lib/challenges/challengeReward";
import { timeRemainingUntil } from "@/lib/challenges/challengeTime";
import { ChallengeCardActions } from "@/components/challenges/ChallengeCardActions";
import { videoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  GN_PRIMARY_BUTTON_CLASS,
  GN_SECONDARY_BUTTON_CLASS,
} from "@/components/ui/gnButtonClasses";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";
import { withLocalizedChallengeContent } from "@/lib/challenges/challengeContent";

function VideoThumb({
  video,
  likeCount,
  className = "",
}: {
  video: ChallengeTopPreview;
  likeCount: number;
  className?: string;
}) {
  const u = videoPlaybackUrl(video);
  const { containerRef, loadMedia } = useMediaNearViewport({
    rootMargin: "180px 0px 180px 0px",
  });
  if (!u) return null;
  return (
    <div
      ref={containerRef}
      className={`relative aspect-video overflow-hidden rounded-xl bg-black ring-1 ring-white/[0.08] ${className}`.trim()}
    >
      {loadMedia ? (
        <video
          className="h-full w-full object-cover opacity-95"
          src={u}
          muted
          playsInline
          preload="metadata"
        />
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pt-6 pb-1.5">
        <p className="px-2 text-end text-[10px] font-bold tabular-nums text-white/95">
          ♥ {likeCount}
        </p>
      </div>
    </div>
  );
}

function AiPeakBadge({ score }: { score: number }) {
  const t = useTranslations("challenges");
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-gn-accent/45 bg-gn-accent/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gn-accent"
      title={t("aiPeakLabel")}
    >
      <span aria-hidden className="text-[9px]">
        ✦
      </span>
      {t("aiScoreShort", { score })}
    </span>
  );
}

export function ChallengesHub() {
  const t = useTranslations("challenges");
  const locale = useLocale();
  const uploadEligibility = useVideoUploadEligibility();

  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [topPreviews, setTopPreviews] = useState<Map<string, ChallengeTopPreview[]>>(
    new Map(),
  );
  const [aiHighlights, setAiHighlights] = useState<
    Map<string, ChallengeAiHighlight>
  >(new Map());
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

    const countMap = await fetchVideoCountsByChallengeId();
    setCounts(countMap);

    const [previewEntries, aiMap] = await Promise.all([
      Promise.all(
        list.map(async (c) => {
          const vids = await fetchTopVideosForChallenge(c.id, 3);
          return [c.id, vids] as const;
        }),
      ),
      fetchBestAiHighlightsForChallenges(list.map((c) => c.id)),
    ]);

    const pmap = new Map<string, ChallengeTopPreview[]>();
    for (const [id, vids] of previewEntries) pmap.set(id, vids);
    setTopPreviews(pmap);
    setAiHighlights(aiMap);
    setLoading(false);
    setRetryBusy(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { activeChallenges, pastChallenges } = useMemo(() => {
    const active: ChallengeRow[] = [];
    const past: ChallengeRow[] = [];
    for (const c of challenges) {
      if (c.status === "active") active.push(c);
      else if (c.status === "ended") past.push(c);
    }
    return { activeChallenges: active, pastChallenges: past };
  }, [challenges]);

  const sortedByPopularity = useMemo(() => {
    return [...activeChallenges].sort((a, b) => {
      const na = counts.get(a.id) ?? 0;
      const nb = counts.get(b.id) ?? 0;
      if (nb !== na) return nb - na;
      return a.title.localeCompare(b.title);
    });
  }, [activeChallenges, counts]);

  const trending = useMemo(() => {
    return sortedByPopularity.filter((c) => (counts.get(c.id) ?? 0) > 0).slice(0, 6);
  }, [sortedByPopularity, counts]);

  const pastSorted = useMemo(() => {
    return [...pastChallenges].sort((a, b) => a.title.localeCompare(b.title));
  }, [pastChallenges]);

  if (loading) {
    return (
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-gn-text-secondary"
        role="status"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
        {t("loading")}
      </div>
    );
  }

  if (loadFailed) {
    return (
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
    );
  }

  if (challenges.length === 0) {
    return (
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
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-8 sm:space-y-10">
      {trending.length > 0 ? (
        <section
          className="min-w-0 space-y-4 overflow-x-clip"
          aria-label={t("trending")}
        >
          <div className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-gn-accent">
              {t("trending")}
            </h2>
            <p className="text-sm text-gn-text-tertiary">{t("trendingDesc")}</p>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {trending.map((c, idx) => {
              const n = counts.get(c.id) ?? 0;
              const prev = topPreviews.get(c.id) ?? [];
              const hero = prev[0];
              const ai = aiHighlights.get(c.id);
              const href = `/challenges/${encodeURIComponent(challengeLinkSegment(c))}` as const;
              return (
                <Link
                  key={c.id}
                  href={href}
                  className="group relative w-[min(14rem,78vw)] shrink-0 snap-start overflow-hidden rounded-2xl border border-gn-border-subtle bg-gradient-to-b from-gn-surface-elevated/90 to-gn-surface/40 shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-[border-color,transform] hover:border-gn-accent/40 hover:-translate-y-0.5"
                >
                  <div className="absolute start-2 top-2 z-10 flex items-center gap-1.5">
                    <span className="rounded-full bg-gn-accent px-2 py-0.5 text-[10px] font-bold text-black">
                      #{idx + 1}
                    </span>
                    {ai ? <AiPeakBadge score={ai.overallScore} /> : null}
                  </div>
                  <div className="relative aspect-[4/3] w-full bg-black">
                    {hero ? (
                      <video
                        className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                        src={videoPlaybackUrl(hero)}
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-gn-accent/20 to-transparent text-xs text-gn-text-tertiary">
                        —
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/50 to-transparent px-3 pb-3 pt-10">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                        {c.title}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-white/75">
                        {t("videoCount", {
                          count: n,
                          video: t("video"),
                          videos: t("videos"),
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-5" aria-label={t("activeChallengesHeading")}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-gn-text-tertiary">
          {t("activeChallengesHeading")}
        </h2>
        <ul className="flex flex-col gap-5">
          {sortedByPopularity.map((c) => {
            const displayChallenge = withLocalizedChallengeContent(c, t, locale);
            const n = counts.get(c.id) ?? 0;
            const prev = topPreviews.get(c.id) ?? [];
            const ai = aiHighlights.get(c.id);
            const rewardLine = challengeRewardHeadline(displayChallenge);
            const tr = timeRemainingUntil(displayChallenge.expires_at);
            return (
              <li key={c.id}>
                <article className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4 transition-colors hover:border-gn-accent/25 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/challenges/${encodeURIComponent(challengeLinkSegment(c))}`}
                          className="text-lg font-semibold tracking-tight text-gn-text transition-colors hover:text-gn-accent"
                        >
                          {displayChallenge.title}
                        </Link>
                        {ai ? <AiPeakBadge score={ai.overallScore} /> : null}
                        {tr && !tr.expired ? (
                          <span className="rounded-full bg-gn-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gn-accent">
                            {t("timeRemaining", { time: tr.label })}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-gn-text-secondary">
                        {t("videoCount", {
                          count: n,
                          video: t("video"),
                          videos: t("videos"),
                        })}
                      </p>
                      {rewardLine ? (
                        <p className="rounded-lg border border-amber-400/25 bg-amber-500/[0.08] px-3 py-2 text-sm font-medium text-amber-100/95">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
                            {t("reward")}{" "}
                          </span>
                          {rewardLine}
                        </p>
                      ) : null}
                      {displayChallenge.description ? (
                        <p className="text-sm text-gn-text-tertiary">{displayChallenge.description}</p>
                      ) : null}
                    </div>
                    <div className="relative z-20 flex shrink-0 flex-col gap-2 self-start sm:flex-row sm:items-center sm:justify-end">
                      <ChallengeCardActions
                        challengeId={c.id}
                        challengeStatus={c.status}
                        detailHref={`/challenges/${encodeURIComponent(challengeLinkSegment(c))}`}
                        density="compact"
                      />
                    </div>
                  </div>

                  {prev.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gn-text-tertiary">
                        {t("topClips")}
                      </p>
                      <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
                        {prev.map((v) => (
                          <VideoThumb
                            key={v.id ?? v.video_url}
                            video={v}
                            likeCount={v.likeCount}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-gn-text-tertiary">{t("empty")}</p>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      {pastSorted.length > 0 ? (
        <section className="space-y-5" aria-label={t("pastChallengesHeading")}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-gn-text-tertiary">
            {t("pastChallengesHeading")}
          </h2>
          <ul className="flex flex-col gap-4">
            {pastSorted.map((c) => {
              const displayChallenge = withLocalizedChallengeContent(c, t, locale);
              const n = counts.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <article className="rounded-xl border border-white/[0.06] bg-gn-surface/20 px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/challenges/${encodeURIComponent(challengeLinkSegment(c))}`}
                        className="font-semibold text-gn-text transition-colors hover:text-gn-accent"
                      >
                        {displayChallenge.title}
                      </Link>
                      <span className="text-xs text-gn-text-tertiary">
                        {t("videoCount", {
                          count: n,
                          video: t("video"),
                          videos: t("videos"),
                        })}
                      </span>
                    </div>
                    {challengeRewardHeadline(displayChallenge) ? (
                      <p className="mt-1 text-xs text-amber-200/85">
                        {challengeRewardHeadline(displayChallenge)}
                      </p>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
