"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import {
  deleteOwnVideoById,
  fetchPlayerProfileBySlug,
  fetchVideosForPlayer,
  type PlayerProfileRow,
  type VideoRow,
} from "@/lib/supabase/playerPublicProfile";
import { usePremium } from "@/components/premium/PremiumProvider";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { userMayMessagePlayers } from "@/lib/scoutVerification";
import { PlayerFollowSection } from "./PlayerFollowSection";
import { ScoutShortlistButton } from "./ScoutShortlistButton";
import { ProfileVideoGrid } from "@/components/profile/ProfileVideoGrid";
import { FoundingPlayerBadge, PlayerPremiumBadge } from "@/components/premium/PremiumBadges";
import { isPlayerPremium } from "@/lib/premium/playerPremium";
import { ProfileUploadLink } from "@/components/profile/ProfileUploadLink";
import { UploadFirstVideoBanner } from "@/components/onboarding/UploadFirstVideoBanner";
import { useUploadFirstVideoDismiss } from "@/hooks/useUploadFirstVideoDismiss";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";
import { APP_PROFILE_SHELL_CLASS } from "@/lib/layout/appShellClasses";

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin text-gn-accent`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
      />
    </svg>
  );
}

type Props = {
  playerSlug: string;
  /** When true, parent already provides {@link APP_PROFILE_SHELL_CLASS}. */
  embedded?: boolean;
};

export function PlayerPublicProfile({ playerSlug, embedded = false }: Props) {
  const t = useTranslations("playerProfile");
  const tProfile = useTranslations("profile");
  const tSv = useTranslations("scoutVerification");
  const td = useTranslations("discover");
  const { userId } = usePremium();
  const scoutGate = useScoutVerification();
  const uploadEligibility = useVideoUploadEligibility();
  const { dismissed: uploadFirstDismissed, dismiss: dismissUploadFirst } =
    useUploadFirstVideoDismiss();

  const unknownPlayer = td("unknownPlayer");

  const [profile, setProfile] = useState<PlayerProfileRow | null | undefined>(
    undefined
  );
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [videosNote, setVideosNote] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadError(null);
      setVideosNote(null);
      setDeleteError(null);
      setDeletingVideoId(null);
      setProfile(undefined);
      setVideos([]);

      const {
        profile: p,
        userAvatarUrl: av,
        errorMessage: profileErr,
      } = await fetchPlayerProfileBySlug(playerSlug);

      if (cancelled) return;

      if (profileErr) {
        setLoadError(profileErr);
        setProfile(null);
        setUserAvatarUrl(null);
        return;
      }

      if (!p) {
        setProfile(null);
        setUserAvatarUrl(null);
        return;
      }

      setProfile(p);
      setUserAvatarUrl(av);

      const { videos: v, errorMessage: vErr } = await fetchVideosForPlayer(p.id);
      if (cancelled) return;
      setVideos(v);
      if (vErr) {
        setVideosNote(vErr);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerSlug]);

  const profileInnerClass =
    "box-border w-full min-w-0 max-w-full space-y-6 overflow-x-hidden";

  function wrapInProfileShell(node: ReactNode) {
    if (embedded) return node;
    return (
      <div data-profile-shell className={APP_PROFILE_SHELL_CLASS}>
        {node}
      </div>
    );
  }

  if (profile === undefined) {
    return wrapInProfileShell(
      <div
        className="flex min-h-[40vh] w-full min-w-0 max-w-full flex-col items-center justify-center gap-3 text-sm text-gn-text-secondary"
        role="status"
      >
        <Spinner className="h-8 w-8" />
        {t("loading")}
      </div>,
    );
  }

  if (loadError) {
    return wrapInProfileShell(
      <div className="box-border w-full min-w-0 max-w-full space-y-4">
        <p role="alert" className="break-words text-sm text-red-300/90">
          {t("loadFailed")} {loadError}
        </p>
        <Link
          href="/discover"
          className="inline-block text-sm font-medium text-gn-accent hover:underline"
        >
          {t("backToDiscover")}
        </Link>
      </div>,
    );
  }

  if (!profile) {
    return wrapInProfileShell(
      <div className="box-border w-full min-w-0 max-w-full space-y-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-10 text-center">
        <h1 className="text-lg font-semibold text-gn-text-primary">
          {t("notFoundTitle")}
        </h1>
        <p className="text-sm text-gn-text-secondary">{t("notFoundBody")}</p>
        <Link
          href="/discover"
          className="inline-block pt-2 text-sm font-medium text-gn-accent hover:underline"
        >
          {t("backToDiscover")}
        </Link>
      </div>,
    );
  }

  const displayName =
    profile.full_name?.trim() ||
    profile.username?.trim() ||
    unknownPlayer;
  const displayUsername =
    profile.username?.trim() ||
    profile.full_name?.trim() ||
    playerSlug.trim() ||
    unknownPlayer;

  const canUseScoutMessaging =
    !scoutGate.loaded ||
    !scoutGate.row ||
    userMayMessagePlayers(scoutGate.row);
  const isOwnProfile = Boolean(userId && profile.id === userId);
  const showUploadFirstBanner =
    isOwnProfile &&
    videos.length === 0 &&
    uploadEligibility === "player" &&
    !uploadFirstDismissed;

  async function onDeleteVideo(videoId: string) {
    if (!isOwnProfile) return;
    const confirmed = window.confirm(t("deleteVideoConfirm"));
    if (!confirmed) return;
    setDeleteError(null);
    setDeletingVideoId(videoId);
    const result = await deleteOwnVideoById(videoId);
    setDeletingVideoId(null);
    if (!result.ok) {
      setDeleteError(result.errorMessage || t("deleteVideoFailed"));
      return;
    }
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  }

  return wrapInProfileShell(
    <div className={profileInnerClass}>
      <header className="box-border min-w-0 max-w-full space-y-3 overflow-x-clip">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar
            name={displayName}
            imageUrl={userAvatarUrl?.trim() || undefined}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="truncate text-xl font-semibold tracking-tight text-gn-text-primary sm:text-2xl">
              {displayName}
            </h1>
            <p className="truncate text-sm text-gn-text-secondary">@{displayUsername}</p>
            {profile.founding_player === true || isPlayerPremium(profile) ? (
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                {profile.founding_player === true ? <FoundingPlayerBadge /> : null}
                {isPlayerPremium(profile) ? <PlayerPremiumBadge /> : null}
              </div>
            ) : null}
          </div>
        </div>
        {userId && profile.id === userId ? (
          <div
            className="profile-actions box-border grid w-full max-w-full min-w-0 grid-cols-1 gap-3 overflow-x-clip max-sm:grid-cols-1 sm:grid-cols-2"
            data-profile-actions
          >
            <Link
              href="/settings/profile"
              className="box-border flex min-h-11 w-full max-w-full min-w-0 items-center justify-center rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-3 py-2.5 text-center text-sm font-medium text-gn-text transition-colors hover:border-gn-accent/40 hover:bg-gn-surface-elevated"
            >
              <span className="min-w-0 truncate">{tProfile("editProfile")}</span>
            </Link>
            <ProfileUploadLink className="min-h-11 w-full max-w-full min-w-0" />
          </div>
        ) : null}
        {userId && profile.id !== userId ? (
          <div className="mt-3 flex min-w-0 max-w-full flex-col gap-3 overflow-x-clip sm:flex-row sm:flex-wrap sm:items-start">
            {canUseScoutMessaging ? (
              <Link
                href={`/messages/${profile.id}`}
                className="inline-flex w-full min-w-0 max-w-full items-center justify-center rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-4 py-2 text-center text-sm font-medium text-gn-text transition-colors hover:border-gn-accent/40 hover:bg-gn-surface-elevated sm:w-auto"
              >
                <span className="truncate">{t("messageUser")}</span>
              </Link>
            ) : (
              <p
                className="min-w-0 max-w-full break-words rounded-xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-3 text-sm text-gn-text-secondary"
                role="status"
              >
                {tSv("messagingLockedHint")}{" "}
                <Link
                  href="/scout-apply"
                  className="font-medium text-gn-accent hover:underline"
                >
                  {tSv("applyCta")}
                </Link>
              </p>
            )}
            {scoutGate.loaded && scoutGate.isApprovedScout ? (
              <div className="min-w-0 w-full max-w-full sm:w-auto">
                <ScoutShortlistButton scoutUserId={userId} playerUserId={profile.id} />
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      <PlayerFollowSection profileUserId={profile.id} />

      {showUploadFirstBanner ? (
        <UploadFirstVideoBanner variant="profile" onLater={dismissUploadFirst} />
      ) : null}

      <section className="min-w-0 max-w-full overflow-x-clip" aria-label={t("videosSectionAria")}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gn-text-tertiary">
          {t("videosHeading")}
        </h2>
        {deleteError ? (
          <p role="alert" className="mb-3 text-xs text-gn-accent">
            {deleteError}
          </p>
        ) : null}
        {videosNote ? (
          <p role="status" className="mb-3 text-xs text-gn-text-tertiary">
            {t("videosPartialError")} {videosNote}
          </p>
        ) : null}
        {videos.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.1] bg-gradient-to-b from-gn-surface/45 to-gn-bg/40 px-5 py-10 text-center">
            <p className="text-base font-semibold text-gn-text">
              {tProfile("noVideosTitle")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gn-text-secondary">
              {tProfile("noVideosDescription")}
            </p>
          </div>
        ) : (
          <ProfileVideoGrid
            videos={videos}
            canDelete={isOwnProfile}
            deletingVideoId={deletingVideoId}
            onDelete={onDeleteVideo}
          />
        )}
      </section>
    </div>,
  );
}
