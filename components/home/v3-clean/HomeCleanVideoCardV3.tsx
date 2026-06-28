"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  PlaybackVideo,
  type PlaybackVideoHandle,
} from "@/components/video/PlaybackVideo";
import { useHomeFeedSound } from "@/components/home/HomeFeedSoundContext";
import { FeedVideoEngagement } from "@/components/home/FeedVideoEngagement";
import { FeedSoundRailButton } from "@/components/home/FeedSoundRailButton";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { VideoShareButton } from "@/components/share/VideoShareButton";
import { ChallengeTagPill } from "@/components/challenges/ChallengeTagPill";
import {
  challengeDisplayTitle,
  challengeLinkSegment,
} from "@/lib/challenges/challengeRowUtils";
import { feedItemVideoKey } from "@/lib/feed/feedItemVideoKey";
import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";
import {
  homeFeedPlaybackCandidates,
  videoPlaybackUrl,
} from "@/lib/video/videoPlaybackUrl";
import { exploreTileVideoPosterAttribute } from "@/lib/video/exploreTileMedia";
import { HOME_CLEAN_V3_CARD_LOCK_STYLE } from "@/components/home/v3-clean/homeCleanV3LayoutLock";
import { PlayerProfileNavLink } from "@/components/player/PlayerProfileNavLink";
import { isHomeFeedMobileViewport } from "@/components/home/homeFeedMobileScrollReset";

type Props = {
  item: AugmentedHomeFeedItem;
  feedIndex: number;
  activeFeedIndex: number;
};

export function HomeCleanVideoCardV3({
  item,
  feedIndex,
  activeFeedIndex,
}: Props) {
  const t = useTranslations("homeFeed");
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<PlaybackVideoHandle>(null);
  const { video, profile, userDisplayName, userAvatarUrl, scoutMetrics, challenge } =
    item;

  const playbackSources = useMemo(
    () => homeFeedPlaybackCandidates(video),
    [video],
  );
  const feedVideoKey = feedItemVideoKey(item);
  const hasUrl =
    (playbackSources[0] ?? videoPlaybackUrl(video)).trim().length > 0;
  const posterUrl = useMemo(
    () => exploreTileVideoPosterAttribute(video, userAvatarUrl),
    [video, userAvatarUrl],
  );

  const userId = (video.user_id ?? "").trim();
  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    userDisplayName?.trim() ||
    t("unknownPlayer");

  const captionText = video.caption?.trim();

  const shareTrailing =
    video.id != null ? (
      <VideoShareButton
        videoId={video.id}
        playerDisplayName={displayName}
        caption={video.caption}
        iconOnly
        stopPropagation
      />
    ) : null;

  const {
    isSoundEnabled,
    activeVideoId,
    reportVideoVisibility,
    playbackGeneration,
    feedUserActivationGeneration,
  } = useHomeFeedSound();

  const isActive = activeVideoId === feedVideoKey;
  const muted = !isSoundEnabled || !isActive;

  const slideOffset = feedIndex - activeFeedIndex;
  const preload: "none" | "metadata" | "auto" =
    slideOffset === 0
      ? "auto"
      : slideOffset === 1 || slideOffset === -1
        ? "metadata"
        : "none";
  const fetchPriority = slideOffset === 0 ? "high" : "low";

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    let obs: IntersectionObserver | null = null;

    const attach = () => {
      obs?.disconnect();
      // Desktop uses document scroll — IO must use the viewport, not the tall feed wrapper.
      const root = isHomeFeedMobileViewport()
        ? el.closest<HTMLElement>("[data-home-clean-v3-scroll-root]")
        : null;

      obs = new IntersectionObserver(
        (entries) => {
          const ratio = entries[0]?.isIntersecting
            ? (entries[0]?.intersectionRatio ?? 0)
            : 0;
          reportVideoVisibility(feedVideoKey, ratio);
        },
        {
          root: root ?? null,
          threshold: [0, 0.25, 0.5, 0.75, 1],
        },
      );
      obs.observe(el);
    };

    attach();
    window.addEventListener("resize", attach, { passive: true });

    return () => {
      window.removeEventListener("resize", attach);
      obs?.disconnect();
      reportVideoVisibility(feedVideoKey, 0);
    };
  }, [feedVideoKey, reportVideoVisibility]);

  useEffect(() => {
    const handle = videoRef.current;
    if (!handle) return;
    handle.syncAudioOutput(muted, 1);
    if (isActive) {
      void handle.play().catch(() => {
        if (!isSoundEnabled) return;
        handle.syncAudioOutput(true, 1);
        void handle.play().catch(() => undefined);
      });
    } else {
      handle.pause();
    }
  }, [
    feedUserActivationGeneration,
    isActive,
    isSoundEnabled,
    muted,
    playbackGeneration,
    playbackSources,
  ]);

  const retryAudiblePlay = useCallback(() => {
    const handle = videoRef.current;
    if (!handle || !isActive || !isSoundEnabled) return;
    handle.syncAudioOutput(false, 1);
    void handle.play().catch(() => undefined);
  }, [isActive, isSoundEnabled]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const handle = videoRef.current;
      if (!handle) return;
      if (document.visibilityState === "hidden") {
        handle.pause();
        return;
      }
      if (activeVideoId === feedVideoKey) {
        void handle.play().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [activeVideoId, feedVideoKey]);

  const avatar = (
    <ProfileAvatar
      name={displayName}
      imageUrl={userAvatarUrl?.trim() || undefined}
      sizeClassName="h-8 w-8 shrink-0 text-[11px] font-semibold"
      className="overflow-hidden rounded-full ring-1 ring-white/30"
    />
  );

  return (
    <div data-home-clean-v3-item>
      <div
        ref={cardRef}
        data-home-clean-v3-card
        style={HOME_CLEAN_V3_CARD_LOCK_STYLE}
      >
        {!hasUrl ? null : (
          <PlaybackVideo
            ref={videoRef}
            sources={playbackSources}
            poster={posterUrl}
            preload={preload}
            fetchPriority={fetchPriority}
            controls={false}
            loop
            muted={muted}
            volume={1}
            onCanPlay={retryAudiblePlay}
            onPlaying={retryAudiblePlay}
            className="absolute inset-0 h-full w-full max-h-full max-w-full object-cover object-center [color-scheme:dark]"
          />
        )}

        {challenge ? (
          <div data-home-clean-v3-challenge>
            <ChallengeTagPill
              routeSegment={challengeLinkSegment(challenge)}
              displayTitle={challengeDisplayTitle(challenge)}
            />
          </div>
        ) : null}

        {video.id ? (
          <div data-home-clean-v3-rail>
            <FeedVideoEngagement
              videoId={video.id}
              initialLikeCount={scoutMetrics?.likesCount ?? null}
              initialCommentCount={scoutMetrics?.commentsCount ?? null}
              variant="rail"
              trailingActions={shareTrailing}
              railSoundSlot={
                hasUrl ? (
                  <FeedSoundRailButton feedVideoKey={feedVideoKey} />
                ) : null
              }
            />
          </div>
        ) : null}
      </div>

      <div data-home-clean-v3-meta>
        <div data-home-clean-v3-meta-row>
          {userId ? (
            <PlayerProfileNavLink
              userId={userId}
              username={profile?.username}
              className="shrink-0"
              data-home-clean-v3-avatar
              aria-label={t("viewPlayerProfileAria", { name: displayName })}
            >
              {avatar}
            </PlayerProfileNavLink>
          ) : (
            <span data-home-clean-v3-avatar className="shrink-0">
              {avatar}
            </span>
          )}
          {userId ? (
            <PlayerProfileNavLink
              userId={userId}
              username={profile?.username}
              data-home-clean-v3-meta-name
              aria-label={t("viewPlayerProfileAria", { name: displayName })}
            >
              {displayName}
            </PlayerProfileNavLink>
          ) : (
            <p data-home-clean-v3-meta-name>{displayName}</p>
          )}
        </div>
        {captionText ? (
          <p data-home-clean-v3-caption>{captionText}</p>
        ) : null}
      </div>
    </div>
  );
}
