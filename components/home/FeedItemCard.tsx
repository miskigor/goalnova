"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";
import { FeedSoundRailButton } from "@/components/home/FeedSoundRailButton";
import { FeedVideoEngagement } from "@/components/home/FeedVideoEngagement";
import { FeedVideoSurface } from "@/components/home/FeedVideoSurface";
import { ChallengeTagPill } from "@/components/challenges/ChallengeTagPill";
import {
  challengeDisplayTitle,
  challengeLinkSegment,
} from "@/lib/challenges/challengeRowUtils";
import { VideoShareButton } from "@/components/share/VideoShareButton";
import { VideoMusicCredit } from "@/components/video/VideoMusicCredit";
import {
  feedCardProps,
  feedMetaProps,
  feedVideoProps,
} from "@/lib/feed/feedScrollContract";
import { feedItemVideoKey } from "@/lib/feed/feedItemVideoKey";
import {
  homeFeedPlaybackCandidates,
  videoPlaybackUrl,
} from "@/lib/video/videoPlaybackUrl";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

/** Home feed slides use overflow-visible so fixed modals/sheets aren’t clipped by the card. */
const DASHBOARD_SLIDE =
  "min-h-[26rem] w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-black sm:min-h-[28rem] lg:min-h-[30rem]";

type Props = {
  item: AugmentedHomeFeedItem;
  slideClassName?: string;
  /** Snap-feed row index (home feed only) — drives preload tier. */
  feedIndex?: number;
  /** Resolved from `useHomeFeedSound` in the parent list (home feed only). */
  activeFeedIndex?: number;
};

export function FeedItemCard({
  item,
  slideClassName = DASHBOARD_SLIDE,
  feedIndex,
  activeFeedIndex,
}: Props) {
  const t = useTranslations("homeFeed");
  const { video, profile, userDisplayName, userAvatarUrl, challenge, scoutMetrics } = item;
  const playbackSources = homeFeedPlaybackCandidates(video);
  const renderedPrimarySrc = playbackSources[0] ?? "";
  const url = renderedPrimarySrc || videoPlaybackUrl(video);
  const feedVideoKey = feedItemVideoKey(item);
  const [loadFailed, setLoadFailed] = useState(false);
  const hasUrl = url.length > 0;
  const hasProcessedAsset = Boolean((video.processed_video_url ?? "").trim());

  const dist =
    feedIndex !== undefined && activeFeedIndex !== undefined
      ? Math.abs(feedIndex - activeFeedIndex)
      : 999;
  const videoPreload: "none" | "metadata" | "auto" =
    feedIndex === undefined || activeFeedIndex === undefined
      ? "metadata"
      : dist <= 3 || feedIndex === 0
        ? "auto"
        : dist <= 9
          ? "metadata"
          : "none";

  const feedVideoDebugMeta = useMemo(
    () => ({
      videoRowId: video.id ?? null,
      source_video_url: video.source_video_url ?? null,
      processed_video_url: video.processed_video_url ?? null,
      video_url: video.video_url ?? null,
    }),
    [
      video.id,
      video.processed_video_url,
      video.source_video_url,
      video.video_url,
    ],
  );

  /** Near active + first row: high; mid distance: auto; far: low. */
  const videoFetchPriority: "high" | "low" | "auto" =
    feedIndex !== undefined && activeFeedIndex !== undefined
      ? dist <= 2 || feedIndex === 0
        ? "high"
        : dist <= 5
          ? "auto"
          : "low"
      : "auto";

  const userId = (video.user_id ?? "").trim();

  const profilePath = useMemo(() => {
    if (!userId) return null;
    const un = profile?.username?.trim();
    const segment = un && un.length > 0 ? un : userId;
    return `/player/${encodeURIComponent(segment)}` as const;
  }, [userId, profile?.username]);

  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    userDisplayName?.trim() ||
    t("unknownPlayer");

  const displayUsername =
    profile?.username?.trim() ||
    profile?.full_name?.trim() ||
    userDisplayName?.trim() ||
    t("unknownPlayer");

  const captionText = video.caption?.trim();

  const shareTrailing =
    video.id ? (
      <VideoShareButton
        videoId={video.id}
        playerDisplayName={displayName}
        caption={video.caption}
        iconOnly
        stopPropagation
        className="[&_button]:flex [&_button]:!h-10 [&_button]:!w-10 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:border-0 [&_button]:bg-white/10 [&_button]:p-0 [&_button]:text-white [&_button]:shadow-[0_4px_24px_rgba(0,0,0,0.35)] [&_button]:backdrop-blur-md [&_button]:hover:bg-white/16 [&_svg]:h-[18px] [&_svg]:w-[18px]"
      />
    ) : null;

  const clipSlide = slideClassName.includes("rounded-2xl");

  return (
    <article
      {...feedCardProps}
      className={`relative isolate flex h-full min-h-0 min-w-0 w-full max-w-full flex-col bg-black ${clipSlide ? "overflow-hidden" : "overflow-x-clip overflow-y-visible"} ${slideClassName}`}
    >
      {/* Fullscreen video — non-interactive so rail controls receive taps */}
      <div {...feedVideoProps} className="pointer-events-none absolute inset-0 z-0 bg-black">
        {challenge ? (
          <div className="pointer-events-none absolute start-2 top-2 z-10 max-w-[min(100%-1rem,240px)] max-lg:top-[calc(env(safe-area-inset-top,0px)+3.75rem)]">
            <div className="pointer-events-auto scale-95 origin-top-left">
              <ChallengeTagPill
                routeSegment={challengeLinkSegment(challenge)}
                displayTitle={challengeDisplayTitle(challenge)}
                className="shadow-md ring-1 ring-black/30 backdrop-blur-md"
              />
            </div>
          </div>
        ) : null}

        {hasUrl ? (
          <FeedVideoSurface
            sources={playbackSources}
            renderedPrimarySrc={renderedPrimarySrc}
            videoId={feedVideoKey}
            preload={videoPreload}
            fetchPriority={videoFetchPriority}
            debugMeta={feedVideoDebugMeta}
            onLoadOk={() => setLoadFailed(false)}
            onLoadError={() => setLoadFailed(true)}
            className="h-full w-full object-cover [color-scheme:dark]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-950 px-4 text-center text-xs text-white/45">
            {t("noVideoUrl")}
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/50"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/85 via-black/35 to-transparent"
          aria-hidden
        />
      </div>

      {/* Floating action rail — must clear fixed bottom nav (z-50) + FAB (bottom ~5.75rem+safe, h-14) on immersive mobile */}
      <div className="pointer-events-auto absolute z-[42] flex w-11 shrink-0 flex-col items-center justify-end end-[max(0.5rem,env(safe-area-inset-right,0px))] sm:end-[max(0.625rem,env(safe-area-inset-right,0px))] sm:w-12 max-lg:top-[calc(env(safe-area-inset-top,0px)+1.75rem)] max-lg:bottom-[calc(11.25rem+env(safe-area-inset-bottom,0px))] lg:top-12 lg:bottom-44">
        <FeedVideoEngagement
          videoId={video.id}
          initialLikeCount={scoutMetrics?.likesCount ?? null}
          initialCommentCount={scoutMetrics?.commentsCount ?? null}
          variant="rail"
          trailingActions={shareTrailing}
          railSoundSlot={
            hasUrl ? <FeedSoundRailButton feedVideoKey={feedVideoKey} /> : null
          }
        />
      </div>

      {/* Bottom-left: avatar + identity + caption (over video) */}
      <div
        {...feedMetaProps}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 max-w-[calc(100%-3.5rem)] px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-3.5 max-lg:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]"
      >
        {loadFailed && hasUrl ? (
          <p
            className="pointer-events-auto mb-1.5 text-[11px] font-medium text-gn-accent"
            role="alert"
          >
            {t("videoLoadFailed")}
          </p>
        ) : null}

        <div className="pointer-events-auto space-y-1.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {profilePath ? (
              <Link
                href={profilePath}
                className="shrink-0 rounded-full ring-1 ring-white/25 shadow-sm transition hover:ring-gn-accent/45"
                aria-label={t("viewPlayerProfileAria", { name: displayName })}
              >
                <ProfileAvatar
                  name={displayName}
                  imageUrl={userAvatarUrl?.trim() || undefined}
                  sizeClassName="h-9 w-9 text-xs font-semibold"
                />
              </Link>
            ) : (
              <ProfileAvatar
                name={displayName}
                imageUrl={userAvatarUrl?.trim() || undefined}
                sizeClassName="h-9 w-9 text-xs font-semibold"
              />
            )}

            <div className="min-w-0 flex-1">
              {profilePath ? (
                <Link
                  href={profilePath}
                  className="block min-w-0"
                  aria-label={t("viewPlayerProfileAria", { name: displayName })}
                >
                  <p className="truncate text-[13px] font-semibold leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
                    {displayName}
                  </p>
                  <p className="truncate text-[11px] font-medium leading-tight text-white/75 [text-shadow:0_1px_6px_rgba(0,0,0,0.85)]">
                    @{displayUsername}
                  </p>
                </Link>
              ) : (
                <>
                  <p className="truncate text-[13px] font-semibold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
                    {displayName}
                  </p>
                  <p className="truncate text-[11px] font-medium text-white/75 [text-shadow:0_1px_6px_rgba(0,0,0,0.85)]">
                    @{displayUsername}
                  </p>
                </>
              )}
            </div>
          </div>

          {captionText ? (
            <p className="line-clamp-2 min-w-0 break-words text-[12px] leading-snug text-white/88 [text-shadow:0_1px_6px_rgba(0,0,0,0.88)]">
              {captionText}
            </p>
          ) : null}

          {item.musicTrack && hasProcessedAsset ? (
            <VideoMusicCredit
              track={item.musicTrack}
              compact
              className="!text-[10px] !leading-tight text-white/55"
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}
