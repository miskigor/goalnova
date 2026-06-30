"use client";

import { useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { FeedVideoSurface } from "@/components/home/FeedVideoSurface";
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
import { HOME_CLEAN_V3_CARD_LOCK_STYLE } from "@/components/home/v3-clean/homeCleanV3LayoutLock";
import { PlayerProfileNavLink } from "@/components/player/PlayerProfileNavLink";

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
  const slideRef = useRef<HTMLDivElement>(null);
  const { video, profile, userDisplayName, userAvatarUrl, scoutMetrics, challenge } =
    item;

  const playbackSources = useMemo(
    () => homeFeedPlaybackCandidates(video),
    [video],
  );
  const renderedPrimarySrc =
    (playbackSources[0] ?? videoPlaybackUrl(video)).trim();
  const feedVideoKey = feedItemVideoKey(item);
  const hasUrl = renderedPrimarySrc.length > 0;

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

  const slideOffset = feedIndex - activeFeedIndex;
  const preload: "none" | "metadata" | "auto" =
    slideOffset === 0
      ? "auto"
      : Math.abs(slideOffset) <= 3
        ? "metadata"
        : "none";
  const fetchPriority = slideOffset === 0 ? "high" : "low";

  const avatar = (
    <ProfileAvatar
      name={displayName}
      imageUrl={userAvatarUrl?.trim() || undefined}
      sizeClassName="h-8 w-8 shrink-0 text-[11px] font-semibold"
      className="overflow-hidden rounded-full ring-1 ring-white/30"
    />
  );

  return (
    <div ref={slideRef} data-home-clean-v3-item>
      <div data-home-clean-v3-card style={HOME_CLEAN_V3_CARD_LOCK_STYLE}>
        {!hasUrl ? null : (
          <FeedVideoSurface
            sources={playbackSources}
            renderedPrimarySrc={renderedPrimarySrc}
            videoId={feedVideoKey}
            preload={preload}
            fetchPriority={fetchPriority}
            mediaFit="cover"
            visibilityObserveRef={slideRef}
            debugMeta={{
              videoRowId: video.id ?? null,
              source_video_url: video.source_video_url,
              processed_video_url: video.processed_video_url,
              video_url: video.video_url,
            }}
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
    </div>
  );
}
