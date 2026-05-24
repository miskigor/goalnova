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
import {
  APP_PROFILE_SHELL_CLASS,
  PUBLIC_PLAYER_PROFILE_SECTION_CLASS,
} from "@/lib/layout/appShellClasses";

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  const v = value?.trim();
  if (!v) return null;
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wider text-gn-text-tertiary sm:text-xs">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-gn-text">{v}</p>
    </div>
  );
}

function formatPlayerAge(age: number | null | undefined): string | null {
  if (typeof age === "number" && Number.isFinite(age)) return String(age);
  return null;
}

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
  const tFields = useTranslations("profileEditor");
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

  const profileSectionClass = PUBLIC_PLAYER_PROFILE_SECTION_CLASS;
  const profileInnerClass = `${profileSectionClass} space-y-6`;

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

  const playerHeight =
    typeof profile.height === "number" && Number.isFinite(profile.height)
      ? tFields("heightCmOption", { n: profile.height })
      : null;
  const playerWeight =
    typeof profile.weight === "number" && Number.isFinite(profile.weight)
      ? tFields("weightKgOption", { n: profile.weight })
      : null;
  const playerBio = profile.bio?.trim() || null;
  const hasPlayerDetails =
    Boolean(
      formatPlayerAge(profile.age) ||
        profile.position?.trim() ||
        profile.city?.trim() ||
        profile.country?.trim() ||
        playerHeight ||
        playerWeight ||
        profile.club?.trim() ||
        profile.preferred_foot?.trim() ||
        playerBio,
    );

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

  const ownProfileMobileCentered = embedded && isOwnProfile;

  return wrapInProfileShell(
    <div
      className={[
        profileInnerClass,
        ownProfileMobileCentered ? "max-lg:text-center" : "",
      ].join(" ")}
    >
      <header className={`${profileSectionClass} space-y-3`}>
        <div
          className={[
            "flex min-w-0 items-center gap-3",
            ownProfileMobileCentered ? "max-lg:flex-col max-lg:justify-center" : "",
          ].join(" ")}
        >
          <ProfileAvatar
            name={displayName}
            imageUrl={userAvatarUrl?.trim() || undefined}
            className="shrink-0"
          />
          <div
            className={[
              "min-w-0 flex-1 overflow-hidden",
              ownProfileMobileCentered ? "max-lg:flex max-lg:w-full max-lg:flex-col max-lg:items-center" : "",
            ].join(" ")}
          >
            <h1 className="truncate text-xl font-semibold tracking-tight text-gn-text-primary sm:text-2xl max-lg:max-w-full">
              {displayName}
            </h1>
            <p className="truncate text-sm text-gn-text-secondary max-lg:max-w-full">
              @{displayUsername}
            </p>
            {profile.founding_player === true || isPlayerPremium(profile) ? (
              <div
                className={[
                  "mt-1.5 flex min-w-0 max-w-full flex-wrap items-center gap-1.5",
                  ownProfileMobileCentered ? "max-lg:justify-center" : "",
                ].join(" ")}
              >
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
          <div className="mt-3 flex w-full min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
            {canUseScoutMessaging ? (
              <Link
                href={`/messages/${profile.id}`}
                className="box-border inline-flex w-full min-w-0 max-w-full items-center justify-center rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-4 py-2 text-center text-sm font-medium text-gn-text transition-colors hover:border-gn-accent/40 hover:bg-gn-surface-elevated sm:max-w-none sm:flex-1"
              >
                <span className="min-w-0 truncate">{t("messageUser")}</span>
              </Link>
            ) : (
              <p
                className="box-border min-w-0 max-w-full break-words rounded-xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-3 text-sm text-gn-text-secondary"
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
              <div className="box-border w-full min-w-0 max-w-full sm:max-w-none sm:flex-1">
                <ScoutShortlistButton scoutUserId={userId} playerUserId={profile.id} />
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {hasPlayerDetails ? (
        <section
          aria-label={t("detailsSectionAria")}
          className={`${profileSectionClass} box-border w-full min-w-0 max-w-full space-y-4 overflow-x-clip rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4 sm:p-5`}
        >
          <div
            className={[
              "grid min-w-0 gap-4 sm:grid-cols-2",
              ownProfileMobileCentered
                ? "max-lg:grid-cols-1 max-lg:justify-items-center max-lg:text-center"
                : "",
            ].join(" ")}
          >
            <DetailRow label={t("age")} value={formatPlayerAge(profile.age)} />
            <DetailRow label={tFields("position")} value={profile.position} />
            <DetailRow label={t("city")} value={profile.city} />
            <DetailRow label={t("country")} value={profile.country} />
            <DetailRow label={tFields("height")} value={playerHeight} />
            <DetailRow label={tFields("weight")} value={playerWeight} />
            <DetailRow label={tFields("club")} value={profile.club} />
            <DetailRow label={tFields("preferredFoot")} value={profile.preferred_foot} />
          </div>
          {playerBio ? (
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-gn-text-tertiary sm:text-xs">
                {t("bio")}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gn-text">
                {playerBio}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <div
        className={[
          profileSectionClass,
          ownProfileMobileCentered ? "max-lg:flex max-lg:justify-center" : "",
        ].join(" ")}
      >
        <PlayerFollowSection
          profileUserId={profile.id}
          className={ownProfileMobileCentered ? "max-lg:mx-auto max-lg:max-w-md" : undefined}
        />
      </div>

      {showUploadFirstBanner ? (
        <UploadFirstVideoBanner variant="profile" onLater={dismissUploadFirst} />
      ) : null}

      <section className={profileSectionClass} aria-label={t("videosSectionAria")}>
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
