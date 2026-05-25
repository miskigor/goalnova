"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { devLog, isDev } from "@/lib/devLog";
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

/** Dashboard embed: framed tile; home immersive slides use {@link FEED_SLIDE} overflow-hidden. */
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
  const playbackSources = useMemo(
    () => homeFeedPlaybackCandidates(item.video),
    [item.video],
  );
  const renderedPrimarySrc = playbackSources[0] ?? "";
  const url = renderedPrimarySrc || videoPlaybackUrl(video);
  const feedVideoKey = feedItemVideoKey(item);
  const [loadFailed, setLoadFailed] = useState(false);
  const hasUrl = url.length > 0;
  const hasProcessedAsset = Boolean((video.processed_video_url ?? "").trim());

  /** Signed offset from focused snap slide: +1 = next (down), -1 = previous (up). */
  const slideOffset =
    feedIndex !== undefined && activeFeedIndex !== undefined
      ? feedIndex - activeFeedIndex
      : null;

  /** Active + next two clips: full buffer; previous two: metadata; rest: none. */
  const videoPreload: "none" | "metadata" | "auto" =
    slideOffset === null
      ? "metadata"
      : slideOffset === 0 || slideOffset === 1 || slideOffset === 2
        ? "auto"
        : slideOffset === -1 || slideOffset === -2
          ? "metadata"
          : "none";

  const videoFetchPriority: "high" | "low" | "auto" =
    slideOffset === null
      ? "auto"
      : slideOffset !== null && Math.abs(slideOffset) <= 2
        ? "high"
        : "low";

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

  useEffect(() => {
    if (!isDev || slideOffset !== 0) return;
    devLog("[PitchRusch][FeedItemCard] active clip playback URL", {
      videoId: video.id,
      renderedPrimarySrc,
      candidates: playbackSources,
    });
  }, [playbackSources, renderedPrimarySrc, slideOffset, video.id]);

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

  const isHomeFeedSlide = feedIndex !== undefined;

  const shareTrailing =
    video.id ? (
      <VideoShareButton
        videoId={video.id}
        playerDisplayName={displayName}
        caption={video.caption}
        iconOnly
        stopPropagation
        className="[&_button]:flex [&_button]:!h-6 [&_button]:!w-6 max-lg:[&_button]:!h-11 max-lg:[&_button]:!w-11 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:border-0 [&_button]:bg-white/10 [&_button]:p-0 [&_button]:text-white [&_button]:shadow-[0_2px_10px_rgba(0,0,0,0.35)] [&_button]:backdrop-blur-md [&_button]:hover:bg-white/16 [&_svg]:h-3 [&_svg]:w-3 max-lg:[&_svg]:!h-[22px] max-lg:[&_svg]:!w-[22px]"
      />
    ) : null;

  return (
    <article
      {...feedCardProps}
      className={`relative isolate box-border flex h-full min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden bg-black max-lg:left-0 max-lg:right-0 max-lg:mx-0 max-lg:translate-x-0 ${slideClassName}`}
    >
      {/* Fullscreen video — non-interactive so rail controls receive taps */}
      <div
        {...feedVideoProps}
        className="pointer-events-none absolute inset-0 z-0 max-w-full overflow-hidden bg-black"
      >
        {challenge ? (
          <div className="pointer-events-none absolute start-2 top-2 z-10 max-w-[min(100%-1rem,240px)]">
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
            mediaFit={isHomeFeedSlide ? "contain" : "cover"}
            preload={videoPreload}
            fetchPriority={videoFetchPriority}
            debugMeta={feedVideoDebugMeta}
            onLoadOk={() => setLoadFailed(false)}
            onLoadError={() => setLoadFailed(true)}
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

      {/* Floating action rail — above bottom nav inset */}
      <div
        data-pitchrusch-feed-rail
        className="pointer-events-auto absolute end-[max(0.75rem,env(safe-area-inset-right,0px))] z-50 flex w-11 max-w-11 flex-col items-center justify-center gap-1 max-lg:bottom-[max(calc(5rem+0.75rem),calc(5rem+0.75rem+var(--gn-mobile-visual-bottom-inset,0px)))] max-lg:top-auto max-lg:max-h-[12rem] lg:end-3 lg:w-10 lg:gap-2 lg:top-12 lg:bottom-44 lg:max-h-none lg:justify-end"
      >
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
        className="pointer-events-none absolute inset-x-0 start-0 z-20 box-border min-w-0 max-w-[calc(100%-5.5rem)] pb-0 pe-2 ps-[max(0.625rem,env(safe-area-inset-left,0px))] pt-0 max-lg:bottom-[max(calc(0.75rem+0.625rem),calc(0.75rem+0.625rem+var(--gn-mobile-visual-bottom-inset,0px)))] lg:inset-x-0 lg:bottom-0 lg:max-w-[calc(100%-4rem)] lg:px-3.5 lg:pt-6 lg:pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        {loadFailed && hasUrl ? (
          <p
            className="pointer-events-auto mb-1.5 text-[11px] font-medium text-gn-accent"
            role="alert"
          >
            {t("videoLoadFailed")}
          </p>
        ) : null}

        <div className="pointer-events-auto space-y-1 max-lg:space-y-1">
          <div className="flex min-w-0 items-center gap-2 max-lg:gap-2.5">
            {profilePath ? (
              <Link
                href={profilePath}
                className="flex h-9 w-9 min-h-9 min-w-9 max-h-9 max-w-9 shrink-0 flex-none items-center justify-center overflow-hidden rounded-full ring-2 ring-white/40 shadow-[0_2px_12px_rgba(0,0,0,0.55)] transition hover:ring-gn-accent/55 max-lg:h-10 max-lg:w-10 max-lg:min-h-10 max-lg:min-w-10 max-lg:max-h-10 max-lg:max-w-10 max-lg:ring-white/45"
                aria-label={t("viewPlayerProfileAria", { name: displayName })}
              >
                <ProfileAvatar
                  name={displayName}
                  imageUrl={userAvatarUrl?.trim() || undefined}
                  sizeClassName="h-9 w-9 min-h-9 min-w-9 max-h-9 max-w-9 shrink-0 flex-none text-xs font-semibold max-lg:h-10 max-lg:w-10 max-lg:min-h-10 max-lg:min-w-10 max-lg:max-h-10 max-lg:max-w-10"
                  className="overflow-hidden rounded-full ring-0"
                />
              </Link>
            ) : (
              <ProfileAvatar
                name={displayName}
                imageUrl={userAvatarUrl?.trim() || undefined}
                sizeClassName="h-9 w-9 min-h-9 min-w-9 max-h-9 max-w-9 shrink-0 flex-none text-xs font-semibold max-lg:h-10 max-lg:w-10 max-lg:min-h-10 max-lg:min-w-10 max-lg:max-h-10 max-lg:max-w-10"
                className="overflow-hidden rounded-full ring-2 ring-white/40 max-lg:ring-white/45 max-lg:shadow-[0_2px_12px_rgba(0,0,0,0.55)]"
              />
            )}

            <div className="min-w-0 flex-1">
              {profilePath ? (
                <Link
                  href={profilePath}
                  className="block min-w-0"
                  aria-label={t("viewPlayerProfileAria", { name: displayName })}
                >
                  <p className="truncate text-[13px] font-semibold leading-tight text-white max-lg:text-[18px] max-lg:font-bold max-lg:leading-tight [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
                    {displayName}
                  </p>
                  <p className="truncate text-[11px] font-medium leading-tight text-white/75 max-lg:text-[14px] max-lg:leading-tight [text-shadow:0_1px_6px_rgba(0,0,0,0.85)]">
                    @{displayUsername}
                  </p>
                </Link>
              ) : (
                <>
                  <p className="truncate text-[13px] font-semibold text-white max-lg:text-[18px] max-lg:font-bold max-lg:leading-tight [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
                    {displayName}
                  </p>
                  <p className="truncate text-[11px] font-medium text-white/75 max-lg:text-[14px] max-lg:leading-tight [text-shadow:0_1px_6px_rgba(0,0,0,0.85)]">
                    @{displayUsername}
                  </p>
                </>
              )}
            </div>
          </div>

          {captionText ? (
            <p className="line-clamp-2 min-w-0 break-words text-[12px] leading-snug text-white/88 max-lg:text-[14px] max-lg:leading-snug [text-shadow:0_1px_6px_rgba(0,0,0,0.88)]">
              {captionText}
            </p>
          ) : null}

          {item.musicTrack && hasProcessedAsset ? (
            <VideoMusicCredit
              track={item.musicTrack}
              compact
              className="!text-[10px] max-lg:!text-[14px] max-lg:!leading-snug text-white/55"
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}
