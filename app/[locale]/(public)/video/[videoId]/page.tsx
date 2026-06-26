import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChallengeTagPill } from "@/components/challenges/ChallengeTagPill";
import { PublicVideoJsonLd } from "@/components/share/PublicVideoJsonLd";
import {
  challengeDisplayTitle,
  challengeLinkSegment,
} from "@/lib/challenges/challengeRowUtils";
import { buildPublicVideoMetadata } from "@/lib/share/buildPublicVideoMetadata";
import { getPublicVideoPageData } from "@/lib/supabase/publicVideoPageData";
import { ensureVideoThumbnailForRow } from "@/lib/video/ensureVideoThumbnail.server";
import { resolvePublicVideoThumbnailUrl } from "@/lib/video/publicVideoThumbnailUrl";
import { exploreTileThumbnailOrPosterImageUrl } from "@/lib/video/exploreTileMedia";
import { videoPlaybackCandidates, videoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";
import { VideoMusicCredit } from "@/components/video/VideoMusicCredit";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PublicVideoDetailPanel } from "@/components/video/PublicVideoDetailPanel";
import { PublicVideoWatchPlayer } from "@/components/video/PublicVideoWatchPlayer";

type Props = {
  params: Promise<{ locale: string; videoId: string }>;
};

/** Cacheable HTML for crawlers — avoid cookies()/searchParams here (forces private no-store). */
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, videoId } = await params;
  const data = await getPublicVideoPageData(videoId);
  const t = await getTranslations({ locale, namespace: "publicVideo" });

  if (!data) {
    return buildPublicVideoMetadata({
      status: "not_found",
      notFoundTitle: t("notFoundTitle"),
    });
  }

  const displayName =
    data.profile?.full_name?.trim() ||
    data.profile?.username?.trim() ||
    t("unknownPlayer");
  const title = t("metaTitle", { name: displayName });
  const description =
    data.video.caption?.trim() || t("metaDescriptionFallback");
  const thumbnailUrl = resolvePublicVideoThumbnailUrl(data.video, data.userAvatarUrl);

  return buildPublicVideoMetadata({
    status: "ok",
    title,
    description,
    videoUrl: videoPlaybackUrl(data.video),
    videoId,
    locale,
    thumbnailUrl,
  });
}

export default async function PublicVideoPage({ params }: Props) {
  const { locale, videoId } = await params;
  setRequestLocale(locale);

  const data = await getPublicVideoPageData(videoId);
  if (!data) notFound();

  const t = await getTranslations({ locale, namespace: "publicVideo" });

  const displayName =
    data.profile?.full_name?.trim() ||
    data.profile?.username?.trim() ||
    t("unknownPlayer");
  const profileSlug =
    data.profile?.username?.trim() ||
    data.profile?.id ||
    data.video.user_id;
  const profileHref = `/player/${encodeURIComponent(profileSlug)}` as const;

  const videoUrl = videoPlaybackUrl(data.video);
  const playbackSources = videoPlaybackCandidates(data.video);
  const posterUrl = resolvePublicVideoThumbnailUrl(data.video, data.userAvatarUrl);
  const caption = data.video.caption?.trim() || t("noCaption");
  const seoDescription =
    data.video.caption?.trim() || t("metaDescriptionFallback");

  if (!exploreTileThumbnailOrPosterImageUrl(data.video)) {
    after(() => {
      void ensureVideoThumbnailForRow(data.video);
    });
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg space-y-6 overflow-x-hidden px-4 py-8 pb-16 sm:px-6 lg:max-w-2xl">
      <PublicVideoJsonLd
        locale={locale}
        videoId={videoId}
        displayName={displayName}
        description={seoDescription}
        videoContentUrl={videoUrl}
        uploadDateIso={data.video.created_at ?? null}
        video={data.video}
        profileAvatarUrl={data.userAvatarUrl}
      />

      <PublicVideoWatchPlayer
        videoId={videoId}
        sources={playbackSources}
        playerDisplayName={displayName}
        caption={data.video.caption}
        posterUrl={posterUrl}
        layout="default"
        showCaptionOverlay
      />

      <div className="contents">
        <header className="min-w-0 space-y-3 pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gn-accent">
            {t("branding")}
          </p>
          <div className="flex min-w-0 items-center gap-2.5 max-lg:gap-2">
            <ProfileAvatar
              name={displayName}
              imageUrl={data.userAvatarUrl?.trim() || undefined}
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-gn-text">
                {displayName}
              </h1>
              <p className="text-sm text-gn-text-secondary">{t("highlightSubtitle")}</p>
              <Link
                href={profileHref}
                className="inline-flex max-w-full truncate text-sm font-medium text-gn-accent hover:underline"
              >
                @{data.profile?.username?.trim() || displayName}
              </Link>
            </div>
          </div>
        </header>

        {data.challenge ? (
          <div className="flex min-w-0 max-w-full flex-wrap gap-2">
            <ChallengeTagPill
              routeSegment={challengeLinkSegment(data.challenge)}
              displayTitle={challengeDisplayTitle(data.challenge)}
            />
          </div>
        ) : null}

        <section className="min-w-0 space-y-2 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
            {t("captionLabel")}
          </h2>
          <p className="break-words text-sm leading-relaxed text-gn-text">{caption}</p>
        </section>

        {data.musicTrack ? (
          <section className="min-w-0 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-3">
            <VideoMusicCredit track={data.musicTrack} />
          </section>
        ) : null}

        <PublicVideoDetailPanel videoId={videoId} ownerUserId={data.video.user_id} />

        <div className="flex min-w-0 pb-0.5">
          <Link
            href="/explore"
            className="text-sm font-medium text-gn-text-secondary underline-offset-2 hover:text-gn-accent hover:underline"
          >
            {t("moreHighlights")}
          </Link>
        </div>
      </div>
    </div>
  );
}
