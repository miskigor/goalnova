import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cookies } from "next/headers";
import { ChallengeTagPill } from "@/components/challenges/ChallengeTagPill";
import { PublicVideoJsonLd } from "@/components/share/PublicVideoJsonLd";
import {
  challengeDisplayTitle,
  challengeLinkSegment,
} from "@/lib/challenges/challengeRowUtils";
import { buildPublicVideoMetadata } from "@/lib/share/buildPublicVideoMetadata";
import { absolutePublicVideoUrl } from "@/lib/share/localizedVideoPath";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";
import { getPublicVideoPageData } from "@/lib/supabase/publicVideoPageData";
import { videoPlaybackCandidates, videoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";
import {
  VIDEO_ENTRY_COOKIE,
  parseVideoEntrySource,
} from "@/lib/video/videoEntryCookie";
import { VideoMusicCredit } from "@/components/video/VideoMusicCredit";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PublicVideoDetailPanel } from "@/components/video/PublicVideoDetailPanel";
import { PublicVideoWatchPlayer } from "@/components/video/PublicVideoWatchPlayer";

type Props = {
  params: Promise<{ locale: string; videoId: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, videoId } = await params;
  const data = await getPublicVideoPageData(videoId);
  const t = await getTranslations({ locale, namespace: "publicVideo" });
  const base = getServerSiteOrigin();

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
  const canonical = base
    ? absolutePublicVideoUrl(base, locale, videoId)
    : undefined;

  return buildPublicVideoMetadata({
    status: "ok",
    title,
    description,
    videoUrl: videoPlaybackUrl(data.video),
    canonicalUrl: canonical,
    locale,
  });
}

export default async function PublicVideoPage({ params, searchParams }: Props) {
  const { locale, videoId } = await params;
  const { from: fromQuery } = await searchParams;
  setRequestLocale(locale);
  const cookieStore = await cookies();
  const entryFrom =
    fromQuery === "explore" || fromQuery === "rankings"
      ? fromQuery
      : parseVideoEntrySource(cookieStore.get(VIDEO_ENTRY_COOKIE)?.value);
  const compactWatch = entryFrom === "explore" || entryFrom === "rankings";
  const profileVideoLayout = compactWatch;

  const data = await getPublicVideoPageData(videoId);
  if (!data) notFound();

  const t = await getTranslations({ locale, namespace: "publicVideo" });
  const tRankings =
    entryFrom === "rankings"
      ? await getTranslations({ locale, namespace: "rankings" })
      : null;

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
  const caption = data.video.caption?.trim() || t("noCaption");
  const seoDescription =
    data.video.caption?.trim() || t("metaDescriptionFallback");

  return (
    <div
      className={
        compactWatch
          ? "mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col justify-end gap-2 overflow-x-hidden px-3 py-2 max-lg:min-h-0 max-lg:pb-3 sm:px-4 lg:max-w-2xl lg:space-y-6 lg:px-6 lg:py-8 lg:pb-16"
          : "mx-auto w-full min-w-0 max-w-lg space-y-6 overflow-x-hidden px-4 py-8 pb-16 sm:px-6 lg:max-w-2xl"
      }
    >
      <PublicVideoJsonLd
        locale={locale}
        videoId={videoId}
        displayName={displayName}
        description={seoDescription}
        videoContentUrl={videoUrl}
        uploadDateIso={data.video.created_at ?? null}
      />

      <PublicVideoWatchPlayer
        videoId={videoId}
        sources={playbackSources}
        playerDisplayName={displayName}
        caption={data.video.caption}
        layout={profileVideoLayout ? "profile" : "default"}
        showCaptionOverlay={!compactWatch}
      />

      <div
        className={
          compactWatch
            ? "flex min-w-0 flex-col gap-2 max-lg:shrink-0"
            : "contents"
        }
      >
        <header
          className={
            compactWatch
              ? "min-w-0 space-y-1"
              : "min-w-0 space-y-3 pb-2"
          }
        >
          {!compactWatch ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gn-accent">
              {t("branding")}
            </p>
          ) : null}
          <div className="flex min-w-0 items-center gap-2.5 max-lg:gap-2">
            <ProfileAvatar
              name={displayName}
              imageUrl={data.userAvatarUrl?.trim() || undefined}
              sizeClassName={compactWatch ? "h-9 w-9 max-lg:h-9 max-lg:w-9 lg:h-14 lg:w-14" : undefined}
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <h1
                className={
                  compactWatch
                    ? "truncate text-base font-semibold tracking-tight text-gn-text max-lg:text-[0.9375rem]"
                    : "truncate text-2xl font-semibold tracking-tight text-gn-text"
                }
              >
                {displayName}
              </h1>
              {!compactWatch ? (
                <p className="text-sm text-gn-text-secondary">{t("highlightSubtitle")}</p>
              ) : null}
              <Link
                href={profileHref}
                className={
                  compactWatch
                    ? "inline-flex max-w-full truncate text-xs font-medium text-gn-accent hover:underline"
                    : "inline-flex max-w-full truncate text-sm font-medium text-gn-accent hover:underline"
                }
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

        <section
          className={
            compactWatch
              ? "min-w-0 space-y-1 rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-3"
              : "min-w-0 space-y-2 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4"
          }
        >
          <h2
            className={
              compactWatch
                ? "text-[10px] font-medium uppercase tracking-wider text-gn-text-tertiary"
                : "text-xs font-medium uppercase tracking-wider text-gn-text-tertiary"
            }
          >
            {t("captionLabel")}
          </h2>
          <p
            className={
              compactWatch
                ? "line-clamp-4 break-words text-xs leading-relaxed text-gn-text"
                : "break-words text-sm leading-relaxed text-gn-text"
            }
          >
            {caption}
          </p>
        </section>

        {data.musicTrack ? (
          <section
            className={
              compactWatch
                ? "min-w-0 rounded-xl border border-gn-border-subtle bg-gn-surface/30 px-3 py-2"
                : "min-w-0 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-3"
            }
          >
            <VideoMusicCredit track={data.musicTrack} />
          </section>
        ) : null}

        <PublicVideoDetailPanel videoId={videoId} ownerUserId={data.video.user_id} />

        <div className="flex min-w-0 pb-0.5">
          <Link
            href={entryFrom === "rankings" ? "/rankings" : "/explore"}
            className={
              compactWatch
                ? "text-xs font-medium text-gn-text-secondary underline-offset-2 hover:text-gn-accent hover:underline"
                : "text-sm font-medium text-gn-text-secondary underline-offset-2 hover:text-gn-accent hover:underline"
            }
          >
            {entryFrom === "rankings" && tRankings ? tRankings("title") : t("moreHighlights")}
          </Link>
        </div>
      </div>
    </div>
  );
}
