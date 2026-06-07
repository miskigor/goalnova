"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  PlaybackVideo,
  type PlaybackVideoHandle,
} from "@/components/video/PlaybackVideo";
import { useHomeFeedSound } from "@/components/home/HomeFeedSoundContext";
import { FeedVideoEngagement } from "@/components/home/FeedVideoEngagement";
import { FeedSoundRailButton } from "@/components/home/FeedSoundRailButton";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { VideoShareButton } from "@/components/share/VideoShareButton";
import { feedItemVideoKey } from "@/lib/feed/feedItemVideoKey";
import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";
import {
  homeFeedPlaybackCandidates,
  videoPlaybackUrl,
} from "@/lib/video/videoPlaybackUrl";

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
  const { video, profile, userDisplayName, userAvatarUrl, scoutMetrics } = item;

  const playbackSources = useMemo(
    () => homeFeedPlaybackCandidates(video),
    [video],
  );
  const feedVideoKey = feedItemVideoKey(item);
  const hasUrl =
    (playbackSources[0] ?? videoPlaybackUrl(video)).trim().length > 0;

  const userId = (video.user_id ?? "").trim();
  const profilePath = useMemo(() => {
    if (!userId) return null;
    const username = profile?.username?.trim();
    const segment = username && username.length > 0 ? username : userId;
    return `/player/${encodeURIComponent(segment)}` as const;
  }, [profile?.username, userId]);

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

    const root =
      el.closest<HTMLElement>("[data-home-clean-v3-scroll-root]") ?? null;
    const obs = new IntersectionObserver(
      (entries) => {
        const ratio = entries[0]?.isIntersecting
          ? (entries[0]?.intersectionRatio ?? 0)
          : 0;
        reportVideoVisibility(feedVideoKey, ratio);
      },
      {
        root,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
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
      sizeClassName="h-full w-full shrink-0 text-[11px] font-semibold"
      className="overflow-hidden rounded-full ring-1 ring-white/30"
    />
  );

  return (
    <div data-home-clean-v3-item>
      <div ref={cardRef} data-home-clean-v3-card>
        {!hasUrl ? <div data-home-clean-v3-fake aria-hidden /> : null}
        {hasUrl ? (
          <PlaybackVideo
            ref={videoRef}
            sources={playbackSources}
            preload={preload}
            fetchPriority={fetchPriority}
            controls={false}
            loop
            muted={muted}
            volume={1}
            onCanPlay={retryAudiblePlay}
            onPlaying={retryAudiblePlay}
            className="block h-full w-full object-cover object-top [color-scheme:dark]"
          />
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
          {profilePath ? (
            <Link
              href={profilePath}
              className="shrink-0"
              data-home-clean-v3-avatar
              aria-label={t("viewPlayerProfileAria", { name: displayName })}
            >
              {avatar}
            </Link>
          ) : (
            <span data-home-clean-v3-avatar className="shrink-0">
              {avatar}
            </span>
          )}
          {profilePath ? (
            <Link
              href={profilePath}
              data-home-clean-v3-meta-name
              aria-label={t("viewPlayerProfileAria", { name: displayName })}
            >
              {displayName}
            </Link>
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
