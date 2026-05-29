"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  fetchRankings,
  type RankingsListItem,
  type RankingsTab,
} from "@/lib/supabase/rankingsFeed";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { VideoMusicCredit } from "@/components/video/VideoMusicCredit";
import { useIosInlineVideoFirstFrameBump } from "@/lib/video/useIosInlineVideoFirstFrameBump";
import { useMediaNearViewport } from "@/lib/video/useMediaNearViewport";
import {
  GN_VIDEO_MEDIA_ELEMENT_ABSOLUTE_CLASS,
  GN_VIDEO_MEDIA_STAGE_CLASS,
  gnVideoMediaDataProps,
} from "@/lib/video/videoMediaDisplayClasses";

const RANKINGS_PAGE_LIMIT = 50;

function RankingsVideoThumb({ sources }: { sources: string[] }) {
  const { containerRef, loadMedia } = useMediaNearViewport({
    rootMargin: "200px 0px 200px 0px",
  });
  const unique = useMemo(
    () => Array.from(new Set(sources.map((s) => s.trim()).filter(Boolean))),
    [sources],
  );
  const uniqueKey = useMemo(() => unique.join("|"), [unique]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const activeSrc = unique[sourceIndex] ?? "";

  useEffect(() => {
    setSourceIndex(0);
  }, [uniqueKey]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  useIosInlineVideoFirstFrameBump(
    videoRef,
    Boolean(loadMedia && activeSrc),
    loadMedia ? activeSrc : "",
  );
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activeSrc) return;
    v.setAttribute("webkit-playsinline", "");
    v.setAttribute("playsinline", "");
  }, [activeSrc]);

  return (
    <div
      ref={containerRef}
      {...gnVideoMediaDataProps}
      className={`relative aspect-video w-[6.5rem] shrink-0 rounded-lg sm:w-32 ${GN_VIDEO_MEDIA_STAGE_CLASS}`}
    >
      {loadMedia && activeSrc ? (
        <video
          ref={videoRef}
          key={activeSrc}
          className={`${GN_VIDEO_MEDIA_ELEMENT_ABSOLUTE_CLASS} [transform:translateZ(0)]`}
          src={activeSrc}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          loop
          onError={() => {
            if (sourceIndex < unique.length - 1) {
              setSourceIndex((i) => i + 1);
            }
          }}
          onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
          onMouseLeave={(e) => {
            e.currentTarget.pause();
            e.currentTarget.currentTime = 0;
          }}
        />
      ) : null}
    </div>
  );
}

function MetricLine({
  tab,
  item,
  t,
}: {
  tab: RankingsTab;
  item: RankingsListItem;
  t: ReturnType<typeof useTranslations<"rankings">>;
}) {
  if (tab === "trending") {
    return (
      <p className="mt-1.5 text-xs font-medium text-gn-accent">
        {t("metricTrending")}: {item.trendingPoints}
      </p>
    );
  }
  if (tab === "top_rated") {
    return (
      <p className="mt-1.5 text-xs font-medium text-gn-accent">
        {t("metricScore")}:{" "}
        {item.overallScore != null ? Math.round(item.overallScore) : "—"}
      </p>
    );
  }
  return (
    <p className="mt-1.5 text-xs font-medium text-gn-accent">
      {t("metricLikes")}: {item.likeCount}
    </p>
  );
}

function RankingCard({
  item,
  tab,
  t,
}: {
  item: RankingsListItem;
  tab: RankingsTab;
  t: ReturnType<typeof useTranslations<"rankings">>;
}) {
  const profileHref = `/player/${encodeURIComponent(item.playerSlug)}`;
  const videoHref = `/video/${encodeURIComponent(item.videoId)}?from=rankings` as const;

  const metaParts: string[] = [];
  if (item.position?.trim()) {
    metaParts.push(`${t("position")}: ${item.position.trim()}`);
  }
  if (item.city?.trim()) {
    metaParts.push(item.city.trim());
  }
  if (item.country?.trim()) {
    metaParts.push(`${t("country")}: ${item.country.trim()}`);
  }
  const metaLine = metaParts.join(" · ");

  return (
    <article className="flex gap-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-3 transition-[border-color,box-shadow,background-color] duration-300 ease-gn-smooth motion-reduce:transition-none hover:border-white/[0.1] hover:bg-gn-surface/45 hover:shadow-[0_12px_40px_-18px_rgba(0,0,0,0.5)] sm:gap-4 sm:p-4">
      <div
        className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5 sm:w-10"
        aria-hidden
      >
        <span className="text-lg font-bold tabular-nums text-gn-accent sm:text-xl">
          {item.rank}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-stretch">
        <Link
          href={videoHref}
          className="flex min-w-0 gap-3 rounded-xl outline-none ring-gn-accent/40 transition-colors hover:bg-white/[0.03] focus-visible:ring-2 sm:min-h-0 sm:flex-1 sm:gap-4"
        >
          <RankingsVideoThumb sources={item.playbackSources} />
          <div className="min-w-0 flex-1 py-0.5">
            <p className="truncate text-sm font-semibold text-gn-text">
              {item.displayName}
            </p>
            <p className="truncate text-xs text-gn-text-secondary">
              @{item.usernameLabel}
            </p>
            {metaLine ? (
              <p className="mt-1 line-clamp-2 text-xs text-gn-text-tertiary">
                {metaLine}
              </p>
            ) : null}
            <MetricLine tab={tab} item={item} t={t} />
            {item.musicTrack ? (
              <VideoMusicCredit track={item.musicTrack} compact className="mt-1" />
            ) : null}
          </div>
        </Link>
        <div className="flex shrink-0 items-center sm:flex-col sm:justify-center sm:border-s sm:border-gn-border-subtle sm:ps-4">
          <Link
            href={profileHref}
            className="text-xs font-medium text-gn-text-secondary underline-offset-2 hover:text-gn-accent hover:underline"
          >
            {t("viewProfile")}
          </Link>
        </div>
      </div>
    </article>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/20 p-3 sm:p-4"
        >
          <div className="h-8 w-9 shrink-0 animate-pulse rounded bg-gn-surface/50" />
          <div className="h-[4.5rem] w-[6.5rem] shrink-0 animate-pulse rounded-lg bg-gn-surface/50 sm:w-32" />
          <div className="min-w-0 flex-1 space-y-2 py-1">
            <div className="h-4 max-w-[12rem] w-[60%] animate-pulse rounded bg-gn-surface/50" />
            <div className="h-3 max-w-[8rem] w-[40%] animate-pulse rounded bg-gn-surface/50" />
            <div className="h-3 w-[75%] animate-pulse rounded bg-gn-surface/50" />
          </div>
        </div>
      ))}
    </div>
  );
}

const TABS: { id: RankingsTab; labelKey: "tabTrending" | "tabTopRated" | "tabMostLiked" }[] =
  [
    { id: "trending", labelKey: "tabTrending" },
    { id: "top_rated", labelKey: "tabTopRated" },
    { id: "most_liked", labelKey: "tabMostLiked" },
  ];

export function RankingsView() {
  const t = useTranslations("rankings");
  const tNav = useTranslations("nav");
  const [tab, setTab] = useState<RankingsTab>("trending");
  const [rows, setRows] = useState<RankingsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryBusy, setRetryBusy] = useState(false);

  const load = useCallback(async (next: RankingsTab) => {
    setLoading(true);
    setLoadFailed(false);
    const { rows: nextRows, error: err } = await fetchRankings(next);
    if (err) {
      logFullSupabaseError("[rankings] fetchRankings", new Error(err), {
        tab: next,
      });
      setRows([]);
      setLoadFailed(true);
    } else {
      setRows(nextRows);
      setLoadFailed(false);
    }
    setLoading(false);
    setRetryBusy(false);
  }, []);

  const onRetry = useCallback(() => {
    setRetryBusy(true);
    void load(tab);
  }, [load, tab]);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-gn-text sm:text-2xl lg:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gn-text-secondary">
          {t("subtitle")}
        </p>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-gn-text-tertiary">
          {t("globalRanking")}
        </p>
        <h2 className="mt-4 text-base font-semibold tracking-tight text-gn-text sm:text-lg">
          {t("topPlayers")}
        </h2>
        <p className="mt-2">
          <Link
            href="/search"
            className="text-sm font-medium text-gn-accent underline-offset-2 hover:underline"
          >
            {t("search")}
          </Link>
          <span className="text-gn-text-tertiary"> · </span>
          <Link
            href="/explore"
            className="text-sm font-medium text-gn-text-secondary underline-offset-2 hover:text-gn-accent hover:underline"
          >
            {tNav("explore")}
          </Link>
        </p>
      </header>

      <div
        className="mb-6 flex gap-1 rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-1"
        role="tablist"
        aria-label={t("tabsAria")}
      >
        {TABS.map(({ id, labelKey }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`rankings-tab-${id}`}
              className={[
                "min-w-0 flex-1 rounded-lg px-2 py-2.5 text-center text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
                active
                  ? "bg-gn-accent/20 text-gn-accent ring-1 ring-gn-accent/35"
                  : "text-gn-text-secondary hover:bg-white/[0.04] hover:text-gn-text",
              ].join(" ")}
              onClick={() => setTab(id)}
              disabled={loading}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      {loading ? <SkeletonList /> : null}

      {!loading && loadFailed ? (
        <div
          className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium text-gn-accent">{t("errorTitle")}</p>
          <p className="mt-2 text-sm text-gn-text-secondary">{t("errorBody")}</p>
          <button
            type="button"
            disabled={retryBusy}
            aria-busy={retryBusy}
            className="mt-4 rounded-xl border border-gn-border-subtle bg-gn-surface-elevated px-4 py-2 text-sm font-medium text-gn-text hover:border-gn-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void onRetry()}
          >
            {retryBusy ? t("retrying") : t("retry")}
          </button>
        </div>
      ) : null}

      {!loading && !loadFailed && rows.length === 0 ? (
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-6 py-12 text-center sm:px-10">
          <p className="text-sm font-medium text-gn-text">{t("noResults")}</p>
          <p className="mt-2 text-sm text-gn-text-secondary">{t("emptyBody")}</p>
          <Link
            href="/explore"
            className={`${GN_SECONDARY_BUTTON_CLASS} mt-6 inline-flex justify-center`}
          >
            {t("emptyExploreCta")}
          </Link>
        </div>
      ) : null}

      {!loading && !loadFailed && rows.length > 0 ? (
        <div
          className="flex flex-col gap-3 sm:gap-4"
          role="tabpanel"
          aria-labelledby={`rankings-tab-${tab}`}
          aria-label={t("leaderboard")}
        >
          {rows.map((item) => (
            <RankingCard key={item.videoId} item={item} tab={tab} t={t} />
          ))}
          {rows.length >= RANKINGS_PAGE_LIMIT ? (
            <div className="pt-2 text-center">
              <Link
                href="/explore"
                className={`${GN_SECONDARY_BUTTON_CLASS} inline-flex justify-center`}
              >
                {t("loadMore")}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
