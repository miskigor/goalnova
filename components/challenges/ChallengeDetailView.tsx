"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ChallengeCardActions } from "@/components/challenges/ChallengeCardActions";
import { ChallengeLeaderboardList } from "@/components/challenges/ChallengeLeaderboardList";
import { ChallengeRewardBanner } from "@/components/challenges/ChallengeRewardBanner";
import { ChallengeWinnersSection } from "@/components/challenges/ChallengeWinnersSection";
import { withLocalizedChallengeContent } from "@/lib/challenges/challengeContent";
import { challengeLinkSegment } from "@/lib/challenges/challengeRowUtils";
import { timeRemainingUntil } from "@/lib/challenges/challengeTime";
import { ExploreVideoCard } from "@/components/explore/ExploreView";
import {
  fetchChallengeBySlugOrId,
  fetchChallengeFeed,
  fetchChallengePodium,
  type ChallengePodiumResult,
  type ChallengeRow,
} from "@/lib/supabase/challenges";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import type { ExploreFeedItem, ExploreSort } from "@/lib/supabase/exploreFeed";
import { ChallengesPageScrollLock } from "@/components/challenges/ChallengesPageScrollLock";
import { videoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";
import {
  exploreTileVideoPosterAttribute,
  exploreTileVideoSrcCandidates,
} from "@/lib/video/exploreTileMedia";
import { useIosInlineVideoFirstFrameBump } from "@/lib/video/useIosInlineVideoFirstFrameBump";
import { gnVideoMediaDataProps } from "@/lib/video/videoMediaDisplayClasses";

type Props = { slug: string };

type YourRankRow = { rank: number; item: ExploreFeedItem };

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

function toScoringRows(value: unknown): Array<{ key: string; value: number }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const out: Array<{ key: string; value: number }> = [];
  for (const [k, v] of Object.entries(value)) {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) continue;
    out.push({ key: k, value: n });
  }
  return out;
}

function ChallengeTikTokCard({ item }: { item: ExploreFeedItem }) {
  const t = useTranslations("explore");
  const { video, profile } = item;
  const username =
    profile?.username?.trim() || profile?.full_name?.trim() || t("unknownPlayer");
  const slug = profile?.username?.trim() || profile?.id || video.user_id;
  const playerHref = `/player/${encodeURIComponent(slug)}` as const;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const candidates = exploreTileVideoSrcCandidates(video);
  const src = candidates[0] ?? videoPlaybackUrl(video) ?? "";
  const poster = exploreTileVideoPosterAttribute(video, item.userAvatarUrl);
  useIosInlineVideoFirstFrameBump(videoRef, Boolean(src), src);
  return (
    <div
      {...gnVideoMediaDataProps}
      className="relative h-full w-full overflow-hidden rounded-2xl border border-gn-border-subtle bg-black"
    >
      {src ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster || undefined}
          className="absolute inset-0 size-full object-cover object-center [color-scheme:dark]"
          playsInline
          controls
          preload="metadata"
        />
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-sm text-gn-text-secondary">
          {t("errorTitle")}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4">
        <div className="pointer-events-auto">
          <a
            href={playerHref}
            className="inline-flex max-w-full items-center gap-2 text-sm font-semibold text-white hover:text-gn-accent"
          >
            @{username}
          </a>
        </div>
      </div>
    </div>
  );
}

export function ChallengeDetailView({ slug }: Props) {
  const searchParams = useSearchParams();
  const highlightVideoId = searchParams.get("highlight")?.trim() || null;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("challenges");
  const locale = useLocale();
  const tEx = useTranslations("explore");
  const [challenge, setChallenge] = useState<ChallengeRow | null | undefined>(
    undefined,
  );
  // Default to a TikTok-style feed; leaderboard is available via the sort buttons.
  const [sort, setSort] = useState<ExploreSort>("newest");
  const [items, setItems] = useState<ExploreFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [metaLoadFailed, setMetaLoadFailed] = useState(false);
  const [feedLoadFailed, setFeedLoadFailed] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  /** Leaderboard-ordered rows when main `sort` is not leaderboard (for “your rank”). */
  const [leaderboardSnapshot, setLeaderboardSnapshot] = useState<ExploreFeedItem[]>(
    [],
  );
  const [podium, setPodium] = useState<ChallengePodiumResult | null>(null);

  const requestId = useRef(0);
  const highlightSortAppliedRef = useRef(false);
  const submitToastShownRef = useRef(false);

  useEffect(() => {
    if (!highlightVideoId || highlightSortAppliedRef.current) return;
    highlightSortAppliedRef.current = true;
    setSort("leaderboard");
  }, [highlightVideoId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChallenge(undefined);
      setMetaLoadFailed(false);
      const { challenge: ch, error: e } = await fetchChallengeBySlugOrId(slug);
      if (cancelled) return;
      if (e) {
        logFullSupabaseError(
          "[ChallengeDetailView] fetchChallengeBySlugOrId",
          new Error(e),
          { slug },
        );
        setMetaLoadFailed(true);
        setChallenge(null);
        return;
      }
      setChallenge(ch ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!challenge?.id) {
      setPodium(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetchChallengePodium({
        challengeId: challenge.id,
        challengeStatus: challenge.status,
      });
      if (!cancelled) setPodium(res);
    })();
    return () => {
      cancelled = true;
    };
  }, [challenge?.id, challenge?.status]);

  useEffect(() => {
    let mounted = true;
    async function readUser() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setViewerUserId(data.session?.user?.id ?? null);
    }
    void readUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void readUser();
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (challenge === undefined || challenge === null || !challenge.id) return;
    if (sort === "leaderboard") {
      setLeaderboardSnapshot([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { items: rows, error: err } = await fetchChallengeFeed({
        challengeId: challenge.id,
        sort: "leaderboard",
      });
      if (cancelled || err) return;
      setLeaderboardSnapshot(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [challenge, sort]);

  const loadFeed = useCallback(
    async (challengeId: string) => {
      const rid = ++requestId.current;
      setFeedLoading(true);
      setFeedLoadFailed(false);
      const { items: next, error: err } = await fetchChallengeFeed({
        challengeId,
        sort,
      });
      if (rid !== requestId.current) return;
      if (err) {
        logFullSupabaseError(
          "[ChallengeDetailView] fetchChallengeFeed",
          new Error(err),
          { challengeId, sort },
        );
        setFeedLoadFailed(true);
        setItems([]);
      } else {
        setItems(next);
        setFeedLoadFailed(false);
      }
      setFeedLoading(false);
    },
    [sort],
  );

  useEffect(() => {
    if (challenge === undefined || challenge === null || !challenge.id) {
      return;
    }
    void loadFeed(challenge.id);
  }, [challenge, loadFeed]);

  useEffect(() => {
    if (
      submitToastShownRef.current ||
      !highlightVideoId ||
      feedLoading ||
      items.length === 0
    ) {
      return;
    }
    if (!items.some((i) => i.video.id === highlightVideoId)) return;

    submitToastShownRef.current = true;

    const cleanUrlTimer = window.setTimeout(() => {
      router.replace(pathname);
    }, 4500);

    return () => window.clearTimeout(cleanUrlTimer);
  }, [highlightVideoId, items, feedLoading, router, pathname]);

  const effectiveLeaderboardItems = useMemo((): ExploreFeedItem[] => {
    if (challenge === undefined || challenge === null) return [];
    return sort === "leaderboard" ? items : leaderboardSnapshot;
  }, [challenge, sort, items, leaderboardSnapshot]);

  const yourBestRank = useMemo((): YourRankRow | null => {
    if (!viewerUserId || effectiveLeaderboardItems.length === 0) return null;
    let best: YourRankRow | null = null;
    effectiveLeaderboardItems.forEach((item, index) => {
      if (item.video.user_id !== viewerUserId) return;
      const rank = index + 1;
      if (!best || rank < best.rank) {
        best = { rank, item };
      }
    });
    return best;
  }, [viewerUserId, effectiveLeaderboardItems]);

  const showYourRank =
    challenge !== undefined &&
    challenge !== null &&
    Boolean(viewerUserId) &&
    !feedLoading &&
    !feedLoadFailed;

  if (challenge === undefined && !metaLoadFailed) {
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

  if (metaLoadFailed) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-500/40 bg-red-950/25 px-4 py-6 text-center"
      >
        <p className="text-sm font-medium text-red-100">{t("challengeDetailErrorTitle")}</p>
        <p className="mt-1 text-sm text-red-100/85">{t("errorBody")}</p>
        <Link
          href="/challenges"
          className="mt-4 inline-block text-sm font-semibold text-gn-accent hover:underline"
        >
          {t("backToChallenges")}
        </Link>
      </div>
    );
  }

  if (challenge === null) {
    return (
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/25 px-4 py-12 text-center">
        <p className="text-sm font-medium text-gn-text">{t("notFoundTitle")}</p>
        <p className="mt-2 text-sm text-gn-text-secondary">{t("notFoundBody")}</p>
        <Link
          href="/challenges"
          className="mt-6 inline-block text-sm font-semibold text-gn-accent hover:underline"
        >
          {t("backToChallenges")}
        </Link>
      </div>
    );
  }

  if (challenge === undefined) {
    return null;
  }

  const ch = withLocalizedChallengeContent(challenge, t, locale);
  const timeLeft = timeRemainingUntil(ch.expires_at);
  const statusEnded = ch.status === "ended";
  const equipment = toStringArray(ch.equipment);
  const rulesList = toStringArray(ch.rules_json);
  const scoringRows = toScoringRows(ch.scoring);

  return (
    <>
      <ChallengesPageScrollLock />
      <div className="box-border w-full min-w-0 max-w-full space-y-5 overflow-x-clip sm:space-y-6">
      <header className="min-w-0 space-y-3">
        <Link
          href="/challenges"
          className="text-xs font-semibold uppercase tracking-wider text-gn-accent hover:underline"
        >
          {t("backToChallenges")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-gn-text sm:text-2xl lg:text-3xl">
            {ch.title}
          </h1>
          {statusEnded ? (
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gn-text-tertiary">
              {t("statusEnded")}
            </span>
          ) : ch.status === "active" ? (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300/95">
              {t("statusLive")}
            </span>
          ) : null}
        </div>
        {ch.description ? (
          <p className="text-sm text-gn-text-secondary">{ch.description}</p>
        ) : null}
        {ch.expires_at ? (
          <p className="text-xs text-gn-text-tertiary">
            {t("ends")}:{" "}
            <time dateTime={ch.expires_at}>
              {new Date(ch.expires_at).toLocaleString()}
            </time>
            {timeLeft && !timeLeft.expired ? (
              <span className="ms-2 font-semibold text-gn-accent">
                · {t("timeRemaining", { time: timeLeft.label })}
              </span>
            ) : timeLeft?.expired && !statusEnded ? (
              <span className="ms-2 font-medium text-amber-300/90">
                · {t("deadlinePassed")}
              </span>
            ) : null}
          </p>
        ) : null}
        <ChallengeRewardBanner challenge={ch} variant="hero" />
        {ch.instructions?.trim() ? (
          <div className="rounded-xl border border-gn-border-subtle bg-gn-surface/25 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gn-text-tertiary">
              {t("detailInstructionsLabel")}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gn-text-secondary">
              {ch.instructions.trim()}
            </p>
          </div>
        ) : null}
        {ch.max_video_duration_seconds != null ? (
          <div className="rounded-xl border border-gn-border-subtle bg-gn-surface/25 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gn-text-tertiary">
              {t("detailMaxVideoDurationLabel")}
            </p>
            <p className="mt-2 text-sm text-gn-text-secondary">
              {ch.max_video_duration_seconds}s
            </p>
          </div>
        ) : null}
        {equipment.length > 0 ? (
          <div className="rounded-xl border border-gn-border-subtle bg-gn-surface/25 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gn-text-tertiary">
              {t("detailEquipmentLabel")}
            </p>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-gn-text-secondary">
              {equipment.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {ch.rules?.trim() ? (
          <div className="rounded-xl border border-gn-border-subtle bg-gn-surface/25 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gn-text-tertiary">
              {t("rules")}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gn-text-secondary">
              {ch.rules.trim()}
            </p>
          </div>
        ) : rulesList.length > 0 ? (
          <div className="rounded-xl border border-gn-border-subtle bg-gn-surface/25 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gn-text-tertiary">
              {t("rules")}
            </p>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-gn-text-secondary">
              {rulesList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {scoringRows.length > 0 ? (
          <div className="rounded-xl border border-gn-border-subtle bg-gn-surface/25 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gn-text-tertiary">
              {t("detailScoringLabel")}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gn-text-secondary">
              {scoringRows.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-4">
                  <span className="capitalize">{row.key.replaceAll("_", " ")}</span>
                  <span className="font-semibold text-gn-text">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {ch.badge?.trim() ? (
          <div className="rounded-xl border border-gn-border-subtle bg-gn-surface/25 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gn-text-tertiary">
              {t("detailBadgeLabel")}
            </p>
            <p className="mt-2 text-sm font-semibold text-gn-accent">{ch.badge.trim()}</p>
          </div>
        ) : null}
        <div className="pt-1">
          <ChallengeCardActions
            challengeId={ch.id}
            challengeStatus={ch.status}
            detailHref={`/challenges/${encodeURIComponent(challengeLinkSegment(ch))}`}
            density="comfortable"
          />
        </div>
      </header>

      {podium && podium.source !== "none" && podium.items.length > 0 && statusEnded ? (
        <ChallengeWinnersSection items={podium.items} source={podium.source} />
      ) : null}

      {showYourRank && yourBestRank != null ? (
        <section
          className="rounded-2xl border border-gn-accent/30 bg-gn-accent/[0.06] p-4 ring-1 ring-gn-accent/15"
          aria-labelledby="challenge-your-rank-heading"
        >
          <h2
            id="challenge-your-rank-heading"
            className="text-xs font-semibold uppercase tracking-wider text-gn-accent"
          >
            {t("yourRankSectionTitle")}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4 sm:gap-4">
            <div className="rounded-xl bg-gn-surface/50 px-2 py-2.5 sm:px-3">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-gn-text-tertiary">
                {t("yourRankRankLabel")}
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-gn-text sm:text-2xl">
                #{yourBestRank.rank}
              </dd>
            </div>
            <div className="rounded-xl bg-gn-surface/50 px-2 py-2.5 sm:px-3">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-gn-text-tertiary">
                {t("yourRankCompetitionLabel")}
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-amber-200/95 sm:text-2xl">
                {yourBestRank.item.competitionScore != null &&
                Number.isFinite(yourBestRank.item.competitionScore)
                  ? Math.round(yourBestRank.item.competitionScore)
                  : t("leaderboardScorePending")}
              </dd>
            </div>
            <div className="rounded-xl bg-gn-surface/50 px-2 py-2.5 sm:px-3">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-gn-text-tertiary">
                {t("yourRankAiLabel")}
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-gn-accent sm:text-2xl">
                {yourBestRank.item.aiOverallScore != null &&
                Number.isFinite(yourBestRank.item.aiOverallScore)
                  ? Math.round(yourBestRank.item.aiOverallScore)
                  : t("leaderboardScorePending")}
              </dd>
            </div>
            <div className="rounded-xl bg-gn-surface/50 px-2 py-2.5 sm:px-3">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-gn-text-tertiary">
                {t("yourRankLikesLabel")}
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-gn-text sm:text-2xl">
                {yourBestRank.item.likeCount}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      <fieldset className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4">
        <legend className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
          {tEx("sort")}
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSort("leaderboard")}
            disabled={feedLoading}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              sort === "leaderboard"
                ? "bg-gn-accent text-black"
                : "border border-gn-border-subtle bg-gn-bg text-gn-text-secondary hover:border-gn-accent/30"
            }`}
          >
            {t("competitionSortLabel")}
          </button>
          <button
            type="button"
            onClick={() => setSort("newest")}
            disabled={feedLoading}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              sort === "newest"
                ? "bg-gn-accent text-black"
                : "border border-gn-border-subtle bg-gn-bg text-gn-text-secondary hover:border-gn-accent/30"
            }`}
          >
            {tEx("newest")}
          </button>
          <button
            type="button"
            onClick={() => setSort("most_liked")}
            disabled={feedLoading}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              sort === "most_liked"
                ? "bg-gn-accent text-black"
                : "border border-gn-border-subtle bg-gn-bg text-gn-text-secondary hover:border-gn-accent/30"
            }`}
          >
            {tEx("mostLiked")}
          </button>
        </div>
      </fieldset>

      {feedLoading ? (
        <div
          className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-gn-text-secondary"
          role="status"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
          {t("loadingVideos")}
        </div>
      ) : null}

      {!feedLoading && feedLoadFailed ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-950/25 px-4 py-6 text-center"
        >
          <p className="text-sm font-medium text-red-100">{t("feedErrorTitle")}</p>
          <p className="mt-1 text-sm text-red-100/85">{t("feedErrorBody")}</p>
          <button
            type="button"
            disabled={feedLoading}
            onClick={() => ch.id && void loadFeed(ch.id)}
            className="mt-4 rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("retry")}
          </button>
        </div>
      ) : null}

      {!feedLoading && !feedLoadFailed && items.length === 0 ? (
        <p className="rounded-2xl border border-gn-border-subtle bg-gn-surface/25 px-4 py-12 text-center text-sm text-gn-text-secondary">
          {t("noVideosYet")}
        </p>
      ) : null}

      {!feedLoading && !feedLoadFailed && items.length > 0 && sort === "leaderboard" ? (
        <ChallengeLeaderboardList
          items={items}
          highlightVideoId={highlightVideoId}
        />
      ) : null}

      {!feedLoading && !feedLoadFailed && items.length > 0 && sort !== "leaderboard" ? (
        <div className="min-w-0">
          <div className="mx-auto w-full max-w-[560px] space-y-4 pb-4">
            {items.map((item) => (
              <div
                key={item.video.id ?? `${item.video.user_id}-${item.video.created_at}`}
                className="aspect-[9/16] w-full min-h-0"
              >
                <ChallengeTikTokCard item={item} />
              </div>
            ))}
          </div>
          <div className="mt-4 hidden">
            {/* kept as reference: grid view */}
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.video.id ?? `${item.video.user_id}-${item.video.created_at}`}>
                  <ExploreVideoCard item={item} showChallengeTag={false} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
    </>
  );
}
