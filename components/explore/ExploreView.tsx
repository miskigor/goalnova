"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PublicVideoEntryLink } from "@/components/video/PublicVideoEntryLink";
import {
  fetchExploreFeed,
  type ExploreFeedItem,
  type ExploreSort,
} from "@/lib/supabase/exploreFeed";
import { devLog } from "@/lib/devLog";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  exploreTileHasVisualMedia,
  exploreTilePrimaryImageUrl,
  exploreTileVideoPosterAttribute,
  exploreTileVideoSrcCandidates,
  trimMediaUrl,
  type VideoWithOptionalThumbnail,
} from "@/lib/video/exploreTileMedia";
import { useIosInlineVideoFirstFrameBump } from "@/lib/video/useIosInlineVideoFirstFrameBump";
import { useMediaNearViewport } from "@/lib/video/useMediaNearViewport";
import {
  GN_VIDEO_MEDIA_ELEMENT_CLASS,
  GN_VIDEO_MEDIA_POSTER_ABSOLUTE_CLASS,
  GN_VIDEO_MEDIA_STAGE_CLASS,
  GN_VIDEO_MEDIA_STAGE_FLEX_CLASS,
  gnVideoMediaDataProps,
} from "@/lib/video/videoMediaDisplayClasses";
import { devWarn } from "@/lib/devLog";
import { PlayerProfileFiltersModal } from "@/components/search/PlayerProfileFiltersModal";
import { PlayerDiscoverCard } from "@/components/discover/PlayerDiscoverCard";
import type { PlayerProfileRow } from "@/lib/supabase/discoverPlayers";
import { PremiumBadge } from "@/components/premium/PremiumBadges";
import { isPlayerPremium } from "@/lib/premium/playerPremium";
import {
  EMPTY_PLAYER_PROFILE_EXTRA,
  parseAgeInput,
  type PlayerProfileExtraFilters,
} from "@/lib/playerProfileSearchFilters";

const SEARCH_DEBOUNCE_MS = 360;

function exploreTileMobileLikeSnapshot(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iP(hone|ad|od)/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const coarse =
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
  return iOS || coarse;
}

/**
 * iOS / coarse-pointer: used so Explore never promotes `<video>` over raster thumbnails
 * (inline video often paints black on iPhone until full decode / play).
 */
function useExploreTileMobileLike(): boolean {
  const [isMobileLike, setIsMobileLike] = useState(exploreTileMobileLikeSnapshot);
  useLayoutEffect(() => {
    setIsMobileLike(exploreTileMobileLikeSnapshot());
  }, []);
  return isMobileLike;
}

/**
 * Explore grid tile media — field-aware `<img>` vs `<video>`,
 * fallbacks, and debug status labels (no decorative chrome).
 */
function ExploreTileMedia({
  videoId,
  video,
  profileAvatarUrl,
  hasAnySource,
  noMediaAriaLabel,
  mediaErrorAriaLabel,
}: {
  videoId: string;
  video: VideoWithOptionalThumbnail;
  profileAvatarUrl?: string | null;
  /** True when DB row has at least one candidate URL (image or video). */
  hasAnySource: boolean;
  noMediaAriaLabel: string;
  mediaErrorAriaLabel: string;
}) {
  const isMobileLike = useExploreTileMobileLike();
  const { containerRef: videoNearRef, loadMedia: loadExploreVideo } =
    useMediaNearViewport({ rootMargin: "220px 0px 220px 0px" });

  const primaryImage = exploreTilePrimaryImageUrl(video, profileAvatarUrl);
  const videoCandidates = exploreTileVideoSrcCandidates(video);
  const videoPosterUrl = exploreTileVideoPosterAttribute(video, profileAvatarUrl);

  const [imageBroken, setImageBroken] = useState(false);
  const [videoIdx, setVideoIdx] = useState(0);
  const [videoExhausted, setVideoExhausted] = useState(false);
  const videoIdxRef = useRef(0);
  useEffect(() => {
    videoIdxRef.current = videoIdx;
  }, [videoIdx]);

  const thumbRaw = trimMediaUrl(video.thumbnail_url) || null;
  const posterRaw = trimMediaUrl(video.poster_url) || null;
  const processedRaw = trimMediaUrl(video.processed_video_url) || null;
  const sourceRaw = trimMediaUrl(video.source_video_url) || null;
  const videoUrlRaw = trimMediaUrl(video.video_url) || null;

  const activeVideoSrc = videoCandidates[videoIdx] ?? "";
  const hasVideoCandidates = videoCandidates.length > 0;
  const showVideo =
    hasVideoCandidates && !videoExhausted && Boolean(activeVideoSrc);
  const displayImageSrc = !showVideo && !imageBroken
    ? primaryImage || videoPosterUrl || null
    : null;

  const renderKind: "IMG" | "VIDEO" | "NO_SRC" | "FAILED" = showVideo
    ? "VIDEO"
    : displayImageSrc
      ? "IMG"
      : !hasAnySource
        ? "NO_SRC"
        : "FAILED";

  const finalChosenSrc = showVideo
    ? activeVideoSrc
    : displayImageSrc ?? null;

  const logKey = useRef<string | null>(null);
  useEffect(() => {
    const key = [
      videoId,
      renderKind,
      finalChosenSrc ?? "",
      String(videoIdx),
      String(imageBroken),
      String(videoExhausted),
    ].join("|");
    if (logKey.current === key) return;
    logKey.current = key;
    const rendersElement =
      renderKind === "IMG"
        ? "<img>"
        : renderKind === "VIDEO"
          ? "<video>"
          : renderKind === "NO_SRC"
            ? "(no source)"
            : "(load failed)";
    devLog("[PitchRusch ExploreTile]", {
      video_id: videoId,
      thumbnail_url: thumbRaw,
      poster_url: posterRaw,
      processed_video_url: processedRaw,
      source_video_url: sourceRaw,
      video_url: videoUrlRaw,
      chosen_media_source: finalChosenSrc,
      video_poster_attribute: videoPosterUrl ?? null,
      video_candidates_ordered: videoCandidates,
      video_candidate_index: videoIdx,
      renders_element: rendersElement,
      is_mobile_like: isMobileLike,
    });
  }, [
    videoId,
    thumbRaw,
    posterRaw,
    processedRaw,
    sourceRaw,
    videoUrlRaw,
    videoCandidates,
    videoIdx,
    finalChosenSrc,
    renderKind,
    imageBroken,
    videoExhausted,
    hasAnySource,
    videoPosterUrl,
    isMobileLike,
  ]);

  useEffect(() => {
    setImageBroken(false);
    setVideoIdx(0);
    setVideoExhausted(false);
  }, [
    videoId,
    thumbRaw,
    posterRaw,
    processedRaw,
    sourceRaw,
    videoUrlRaw,
    profileAvatarUrl,
    hasAnySource,
  ]);

  const onImgError = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      const src = e.currentTarget.currentSrc || e.currentTarget.src;
      devWarn("[PitchRusch ExploreTile] <img> load error", {
        video_id: videoId,
        src,
      });
      setImageBroken(true);
    },
    [videoId],
  );

  const exploreVideoElRef = useRef<HTMLVideoElement | null>(null);
  const exploreVideoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    exploreVideoElRef.current = node;
    if (node) {
      node.setAttribute("webkit-playsinline", "");
      node.setAttribute("playsinline", "");
    }
  }, []);

  useIosInlineVideoFirstFrameBump(
    exploreVideoElRef,
    Boolean(showVideo && activeVideoSrc && loadExploreVideo),
    loadExploreVideo ? activeVideoSrc : "",
  );

  const onVideoError = useCallback(
    (e: SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      const me = v.error;
      const code = me?.code;
      // Seek / remount can fire aborted — ne troši fallback kandidate.
      if (code === MediaError.MEDIA_ERR_ABORTED) return;

      const src = v.currentSrc || v.src || activeVideoSrc;
      const detail = [
        `video_id=${videoId}`,
        `mediaErrorCode=${code ?? "none"}`,
        `mediaErrorMessage=${me?.message ?? ""}`,
        `networkState=${v.networkState}`,
        `readyState=${v.readyState}`,
        `src=${src}`,
        `candidateIndex=${videoIdxRef.current}/${videoCandidates.length}`,
      ].join(" ");
      const i = videoIdxRef.current;
      const hasFallback = i < videoCandidates.length - 1;
      devWarn(
        `[PitchRusch ExploreTile] <video> load error (${hasFallback ? "fallback" : "exhausted"}) ${detail}`,
      );
      if (hasFallback) {
        setVideoIdx(i + 1);
      } else {
        setVideoExhausted(true);
      }
    },
    [videoId, activeVideoSrc, videoCandidates.length],
  );

  if (showVideo && activeVideoSrc) {
    return (
      <div
        ref={videoNearRef}
        {...gnVideoMediaDataProps}
        className={`relative z-0 ${GN_VIDEO_MEDIA_STAGE_FLEX_CLASS}`}
      >
        {loadExploreVideo ? (
          <video
            ref={exploreVideoRefCallback}
            key={`${videoId}-${activeVideoSrc}`}
            className={`pointer-events-none z-0 flex-1 [transform:translateZ(0)] ${GN_VIDEO_MEDIA_ELEMENT_CLASS}`}
            src={activeVideoSrc}
            poster={videoPosterUrl || undefined}
            muted
            playsInline
            preload="metadata"
            tabIndex={-1}
            controls={false}
            onError={onVideoError}
          />
        ) : videoPosterUrl || primaryImage ? (
          <Image
            src={videoPosterUrl || primaryImage || ""}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className={GN_VIDEO_MEDIA_POSTER_ABSOLUTE_CLASS}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 z-0 bg-neutral-900" aria-hidden />
        )}
      </div>
    );
  }

  if (displayImageSrc) {
    return (
      <div
        {...gnVideoMediaDataProps}
        className={`relative ${GN_VIDEO_MEDIA_STAGE_CLASS}`}
      >
        <Image
          src={displayImageSrc}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className={`z-0 [transform:translateZ(0)] ${GN_VIDEO_MEDIA_POSTER_ABSOLUTE_CLASS}`}
          priority={isMobileLike}
          unoptimized
          onError={onImgError}
        />
      </div>
    );
  }

  if (!hasAnySource) {
    return (
      <div
        className="flex h-full min-h-[120px] w-full items-center justify-center px-3 text-center"
        aria-label={noMediaAriaLabel}
      >
        <span
          className="inline-flex size-8 items-center justify-center rounded-full border border-neutral-500/40 text-neutral-500/80"
          aria-hidden
        >
          ?
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-[120px] w-full items-center justify-center px-3 text-center"
      aria-label={mediaErrorAriaLabel}
    >
      <span
        className="inline-flex size-8 items-center justify-center rounded-full border border-red-500/40 text-red-500/90"
        aria-hidden
      >
        !
      </span>
    </div>
  );
}

export function ExploreVideoCard({
  item,
  showChallengeTag: _showChallengeTag = true,
}: {
  item: ExploreFeedItem;
  /** Reserved — full card styling will use this again later */
  showChallengeTag?: boolean;
}) {
  void _showChallengeTag;
  const t = useTranslations("explore");
  const { video, profile } = item;
  const videoRow = video as VideoWithOptionalThumbnail;
  const username =
    profile?.username?.trim() ||
    profile?.full_name?.trim() ||
    t("unknownPlayer");
  const slug =
    profile?.username?.trim() ||
    profile?.id ||
    video.user_id;

  const avatarUrl = item.userAvatarUrl?.trim() || undefined;
  if (!video.id) return null;

  const hasAnySource = exploreTileHasVisualMedia(videoRow, avatarUrl);

  const playerHref = `/player/${encodeURIComponent(slug)}` as const;
  const videoPageHref = `/video/${encodeURIComponent(video.id)}` as const;

  return (
    <div className="box-border flex w-full min-w-0 max-w-full flex-col overflow-hidden">
      <div className="relative aspect-[3/4] w-full min-w-0 max-w-full overflow-hidden lg:aspect-video">
        <PublicVideoEntryLink
          href={videoPageHref}
          entryFrom="explore"
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/50"
        >
          <div className="absolute inset-0 min-h-0 min-w-0">
            <ExploreTileMedia
              videoId={video.id}
              video={videoRow}
              profileAvatarUrl={avatarUrl}
              hasAnySource={hasAnySource}
              noMediaAriaLabel={t("unknownPlayer")}
              mediaErrorAriaLabel={t("errorTitle")}
            />
          </div>
        </PublicVideoEntryLink>
      </div>

      <div className="box-border min-w-0 max-w-full overflow-hidden px-1.5 py-1.5 sm:px-2">
        <Link
          href={playerHref}
          className="block min-w-0 max-w-full truncate text-sm text-gn-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/50"
          aria-label={t("openPlayerProfileAria", { name: username })}
        >
          @{username}
        </Link>
        {isPlayerPremium(profile) ? (
          <div className="mt-1 max-w-full min-w-0 overflow-hidden">
            <PremiumBadge />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ExploreView({ frameHeader }: { frameHeader?: ReactNode }) {
  const t = useTranslations("explore");
  const ts = useTranslations("search");

  const [nameInput, setNameInput] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [extraFilters, setExtraFilters] = useState<PlayerProfileExtraFilters>({
    ...EMPTY_PLAYER_PROFILE_EXTRA,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [sort, setSort] = useState<ExploreSort>("newest");

  const [items, setItems] = useState<ExploreFeedItem[]>([]);
  const [playerMatches, setPlayerMatches] = useState<PlayerProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const requestId = useRef(0);

  const hasActivePlayerSearch =
    debouncedName.trim().length > 0 ||
    extraFilters.position.trim().length > 0 ||
    extraFilters.country.trim().length > 0 ||
    extraFilters.city.trim().length > 0 ||
    extraFilters.ageMinStr.trim().length > 0 ||
    extraFilters.ageMaxStr.trim().length > 0 ||
    extraFilters.preferredFoot.trim().length > 0 ||
    extraFilters.club.trim().length > 0;

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedName(nameInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [nameInput]);

  const applyFilters = useCallback(() => {
    setDebouncedName(nameInput.trim());
  }, [nameInput]);

  const resetFilters = useCallback(() => {
    setNameInput("");
    setDebouncedName("");
    setExtraFilters({ ...EMPTY_PLAYER_PROFILE_EXTRA });
    setRecentOnly(false);
    setSort("newest");
  }, []);

  const load = useCallback(async () => {
    const rid = ++requestId.current;
    setLoading(true);
    setLoadFailed(false);
    const ageMin = parseAgeInput(extraFilters.ageMinStr);
    const ageMax = parseAgeInput(extraFilters.ageMaxStr);
    const { items: next, playerMatches: nextPlayers, error: err } = await fetchExploreFeed({
      search: debouncedName,
      position: extraFilters.position,
      country: extraFilters.country,
      city: extraFilters.city,
      ageMin,
      ageMax,
      preferredFoot: extraFilters.preferredFoot,
      club: extraFilters.club,
      recentVideosOnly: recentOnly,
      sort,
    });
    if (rid !== requestId.current) return;
    if (err) {
      logFullSupabaseError("[PitchRusch explore] feed load", new Error(err));
      setLoadFailed(true);
      setItems([]);
      setPlayerMatches([]);
    } else {
      setItems(next);
      setPlayerMatches(nextPlayers);
      setLoadFailed(false);
    }
    setLoading(false);
  }, [debouncedName, extraFilters, recentOnly, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="box-border w-full min-w-0 max-w-full space-y-5 overflow-x-clip sm:space-y-6">
      <section
        data-pitchrusch-explore-frame
        className="box-border w-full min-w-0 max-w-full space-y-4 overflow-x-clip rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-3 sm:p-5"
        aria-labelledby="explore-page-title"
      >
        {frameHeader}

        <label htmlFor="explore-player-name" className="block text-sm font-medium text-gn-text">
          {ts("nameLabel")}
        </label>
        <div className="relative mt-1.5">
          <input
            suppressHydrationWarning
            id="explore-player-name"
            type="search"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={ts("namePlaceholder")}
            className="w-full rounded-xl border border-gn-border bg-gn-bg py-2.5 pe-3 ps-10 text-sm text-gn-text outline-none ring-gn-accent/20 placeholder:text-gn-text-tertiary focus:border-gn-accent/50 focus:ring-2"
            autoComplete="off"
          />
          <span
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gn-text-tertiary"
            aria-hidden
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="size-[1.125rem]"
            >
              <circle cx="11" cy="11" r="7.25" />
              <path d="M16.65 16.65 21 21" />
            </svg>
          </span>
        </div>
        {!hasActivePlayerSearch ? (
          <p className="text-xs leading-relaxed text-gn-text-tertiary">{t("searchPlayersHint")}</p>
        ) : null}

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full rounded-xl border border-gn-border-subtle bg-gn-surface/40 py-2.5 text-sm font-semibold text-gn-text transition-colors hover:border-gn-accent/40 hover:bg-gn-surface-elevated/50 sm:w-auto sm:px-4"
        >
          {ts("openDetailedSearch")}
        </button>

        <PlayerProfileFiltersModal
          open={modalOpen}
          initial={extraFilters}
          onClose={() => setModalOpen(false)}
          onApply={(next) => setExtraFilters(next)}
          exploreSort={sort}
          onExploreSortChange={setSort}
          exploreSortDisabled={loading}
        />

        <div className="box-border grid w-full min-w-0 max-w-full grid-cols-1 gap-3 overflow-x-clip sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <label className="flex cursor-pointer items-center gap-2 sm:col-span-2 lg:col-span-2 lg:justify-end">
            <input
              suppressHydrationWarning
              type="checkbox"
              checked={recentOnly}
              onChange={(e) => setRecentOnly(e.target.checked)}
              className="size-4 rounded border-gn-border text-gn-accent focus:ring-gn-accent/30"
            />
            <span className="text-sm text-gn-text-secondary">{t("recentVideosOnly")}</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gn-border-subtle pt-4">
          <button
            type="button"
            onClick={() => applyFilters()}
            disabled={loading}
            className="rounded-xl border border-gn-accent/40 bg-gn-accent/15 px-4 py-2 text-xs font-semibold text-gn-accent transition-colors hover:bg-gn-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("apply")}
          </button>
          <button
            type="button"
            onClick={() => resetFilters()}
            disabled={loading}
            className="rounded-xl border border-gn-border-subtle bg-gn-bg px-4 py-2 text-xs font-semibold text-gn-text-secondary transition-colors hover:border-gn-accent/30 hover:text-gn-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("reset")}
          </button>
        </div>
      </section>

      {loading ? (
        <div
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-gn-text-secondary"
          role="status"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
          {t("loading")}
        </div>
      ) : null}

      {!loading && loadFailed ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-950/25 px-4 py-6 text-center"
        >
          <p className="text-sm font-medium text-red-100">{t("errorTitle")}</p>
          <p className="mt-1 text-sm text-red-100/85">{t("errorBody")}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-black"
          >
            {t("retry")}
          </button>
        </div>
      ) : null}

      {!loading && !loadFailed && items.length === 0 && playerMatches.length === 0 ? (
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/25 px-4 py-16 text-center">
          <p className="text-sm font-medium text-gn-text">{t("noResults")}</p>
          <p className="mt-2 text-sm text-gn-text-secondary">{t("noResultsHint")}</p>
        </div>
      ) : null}

      {!loading && !loadFailed && playerMatches.length > 0 ? (
        <section className="space-y-3" aria-labelledby="explore-players-without-highlights">
          <h2
            id="explore-players-without-highlights"
            className="text-sm font-semibold text-gn-text"
          >
            {t("playersWithoutHighlights")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {playerMatches.map((row) => (
              <li key={row.id}>
                <PlayerDiscoverCard row={row} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && !loadFailed && items.length > 0 ? (
        <ul className="box-border grid w-full min-w-0 max-w-full grid-cols-[repeat(3,minmax(0,1fr))] gap-1 overflow-x-clip sm:gap-1.5 md:gap-2 lg:grid-cols-3 lg:gap-4">
          {items.map((item) => (
            <li
              className="box-border min-w-0 max-w-full overflow-hidden"
              key={item.video.id ?? `${item.video.user_id}-${item.video.created_at}`}
            >
              <ExploreVideoCard item={item} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
