"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChallengeFriendButton } from "@/components/friendChallenge/ChallengeFriendButton";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import {
  deleteOwnVideoById,
  fetchPlayerProfileBySlug,
  fetchVideosForPlayer,
  type PlayerProfileRow,
  type VideoRow,
} from "@/lib/supabase/playerPublicProfile";
import { rpcAdminDeleteVideo } from "@/lib/supabase/adminSystem";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { usePremium } from "@/components/premium/PremiumProvider";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { userMayMessagePlayers } from "@/lib/scoutVerification";
import { PlayerFollowSection } from "./PlayerFollowSection";
import { ScoutShortlistButton } from "./ScoutShortlistButton";
import { ProfileVideoGrid } from "@/components/profile/ProfileVideoGrid";
import {
  ChallengeKingBadge,
  FoundingPlayerBadge,
  PlayerPremiumBadge,
} from "@/components/premium/PremiumBadges";
import {
  fetchPlayerProfileGamification,
  type PlayerProfileGamification,
} from "@/lib/supabase/playerProfileGamification";
import { isPlayerPremium } from "@/lib/premium/playerPremium";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { UploadFirstVideoBanner } from "@/components/onboarding/UploadFirstVideoBanner";
import { useUploadFirstVideoDismiss } from "@/hooks/useUploadFirstVideoDismiss";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";
import {
  APP_PROFILE_SHELL_CLASS,
  PUBLIC_PLAYER_PROFILE_SECTION_CLASS,
} from "@/lib/layout/appShellClasses";
import { profileVideosDebug } from "@/lib/profile/profileVideosDebug";
import { publicProfileDebug } from "@/lib/profile/publicProfileDebug";
import { scheduleProfilePageScrollReset } from "@/lib/profile/profilePageScrollReset";

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  const v = value?.trim();
  if (!v) return null;
  return (
    <div className="min-w-0 max-lg:space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-gn-text-tertiary max-lg:text-[10px] sm:text-xs">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-gn-text max-lg:mt-0.5 max-lg:text-xs">{v}</p>
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
  /** Public `/player/[slug]` via {@link PlayerPublicProfilePage} (not /profile). */
  publicProfile?: boolean;
  /** From parent {@link usePathname} (locale stripped). */
  i18nPathname?: string;
  /** Optional avatar URL from parent (e.g. own profile load) before slug fetch completes. */
  prefetchedAvatarUrl?: string | null;
  /** Server-hydrated profile (skips client profile RPC on first paint). */
  initialProfile?: PlayerProfileRow | null;
  initialUserAvatarUrl?: string | null;
  initialVideos?: VideoRow[];
};

export function PlayerPublicProfile({
  playerSlug,
  embedded = false,
  publicProfile = false,
  i18nPathname = "",
  prefetchedAvatarUrl = null,
  initialProfile,
  initialUserAvatarUrl = null,
  initialVideos,
}: Props) {
  const t = useTranslations("playerProfile");
  const tChallenges = useTranslations("challenges.freestyle");
  const tProfile = useTranslations("profile");
  const tFields = useTranslations("profileEditor");
  const tSv = useTranslations("scoutVerification");
  const td = useTranslations("discover");
  const tAdmin = useTranslations("adminDashboard");
  const { userId } = usePremium();
  const { loaded: adminLoaded, isSuperAdmin, isModerator } = useAdminAccess();
  const scoutGate = useScoutVerification();
  const uploadEligibility = useVideoUploadEligibility();
  const { dismissed: uploadFirstDismissed, dismiss: dismissUploadFirst } =
    useUploadFirstVideoDismiss();

  const unknownPlayer = td("unknownPlayer");

  const [profile, setProfile] = useState<PlayerProfileRow | null | undefined>(
    initialProfile !== undefined ? initialProfile : undefined,
  );
  const [videos, setVideos] = useState<VideoRow[]>(initialVideos ?? []);
  const [videosNote, setVideosNote] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(
    initialUserAvatarUrl ?? prefetchedAvatarUrl,
  );
  const [gamification, setGamification] = useState<PlayerProfileGamification | null>(null);

  useEffect(() => {
    if (!publicProfile) return;
    publicProfileDebug("content mounted", {
      i18nPathname,
      playerSlug,
      extra: { component: "PlayerPublicProfile" },
    });
  }, [playerSlug, publicProfile, i18nPathname]);

  useEffect(() => {
    if (!profile?.id) return;
    return scheduleProfilePageScrollReset(
      typeof window !== "undefined" ? window.location.pathname : "",
    );
  }, [profile?.id, playerSlug]);

  useEffect(() => {
    const userId = profile?.id?.trim();
    if (!userId) {
      setGamification(null);
      return;
    }

    let cancelled = false;
    void fetchPlayerProfileGamification(userId).then((data) => {
      if (!cancelled) setGamification(data);
    });

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      profileVideosDebug("fetch start", { playerSlug });
      setLoadError(null);
      setVideosNote(null);
      setDeleteError(null);
      setDeletingVideoId(null);

      const hydrateProfileOnly = initialProfile !== undefined;
      const hydrateVideosToo = hydrateProfileOnly && initialVideos !== undefined;

      if (hydrateVideosToo) {
        return;
      }

      if (!hydrateProfileOnly) {
        setProfile(undefined);
        setVideos([]);
      }

      let resolvedProfile = hydrateProfileOnly ? initialProfile : null;
      let resolvedAvatar = hydrateProfileOnly
        ? initialUserAvatarUrl ?? prefetchedAvatarUrl
        : null;

      if (!hydrateProfileOnly) {
        const {
          profile: p,
          userAvatarUrl: av,
          errorMessage: profileErr,
        } = await fetchPlayerProfileBySlug(playerSlug);

        if (cancelled) return;

        if (profileErr) {
          profileVideosDebug("fetch profile error", { playerSlug, profileErr });
          setLoadError(profileErr);
          setProfile(null);
          setUserAvatarUrl(null);
          return;
        }

        if (!p) {
          profileVideosDebug("fetch profile empty", { playerSlug });
          setProfile(null);
          setUserAvatarUrl(null);
          return;
        }

        resolvedProfile = p;
        resolvedAvatar = av;
        setProfile(p);
        setUserAvatarUrl(av);
      }

      if (!resolvedProfile?.id) {
        return;
      }

      const { videos: v, errorMessage: vErr } = await fetchVideosForPlayer(
        resolvedProfile.id,
      );
      if (cancelled) return;
      setVideos(v);
      if (resolvedAvatar) {
        setUserAvatarUrl(resolvedAvatar);
      }
      if (publicProfile) {
        publicProfileDebug("videos query done", {
          i18nPathname,
          playerSlug,
          videosCount: v.length,
          extra: {
            userId: resolvedProfile.id,
            fetchError: vErr ?? null,
            query: "fetchVideosForPlayer",
          },
        });
      } else {
        profileVideosDebug("fetch videos done", {
          count: v.length,
          userId: resolvedProfile.id,
          fetchError: vErr ?? null,
        });
      }
      if (vErr) {
        setVideosNote(vErr);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    playerSlug,
    publicProfile,
    i18nPathname,
    initialProfile,
    initialVideos,
    initialUserAvatarUrl,
    prefetchedAvatarUrl,
  ]);

  const profileSectionClass = PUBLIC_PLAYER_PROFILE_SECTION_CLASS;
  const profileInnerClass = `${profileSectionClass} space-y-6 max-lg:space-y-1.5`;

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
  const canAdminDeleteVideo =
    adminLoaded && (isSuperAdmin || isModerator) && !isOwnProfile;
  const canDeleteVideos = isOwnProfile || canAdminDeleteVideo;

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
    if (!canDeleteVideos) return;
    const confirmed = window.confirm(
      isOwnProfile ? t("deleteVideoConfirm") : tAdmin("confirmDeleteVideo"),
    );
    if (!confirmed) return;
    setDeleteError(null);
    setDeletingVideoId(videoId);
    const result = isOwnProfile
      ? await deleteOwnVideoById(videoId)
      : await rpcAdminDeleteVideo(videoId).then((res) => ({
          ok: res.ok,
          errorMessage: res.error,
        }));
    setDeletingVideoId(null);
    if (!result.ok) {
      const message = result.errorMessage || t("deleteVideoFailed");
      setDeleteError(message);
      window.alert(message);
      return;
    }
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  }

  const resolvedAvatarUrl =
    prefetchedAvatarUrl?.trim() ||
    userAvatarUrl?.trim() ||
    profile?.avatar_url?.trim() ||
    undefined;

  return wrapInProfileShell(
    <div className={profileInnerClass}>
      <header
        data-profile-header
        className={`${profileSectionClass} max-lg:mt-2 max-lg:pt-2 space-y-2 max-lg:space-y-1.5 sm:space-y-3`}
      >
        <div className="flex min-w-0 items-start gap-2.5 max-lg:gap-2">
          <div data-profile-avatar-slot className="relative shrink-0">
            <ProfileAvatar
              name={displayName}
              imageUrl={resolvedAvatarUrl}
              sizeClassName="size-12"
              className="ring-1 ring-gn-accent/40"
            />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden pt-1 max-lg:pt-1.5">
            <h1 className="truncate text-lg font-semibold tracking-tight text-gn-text-primary max-lg:text-sm max-lg:font-medium sm:text-2xl">
              {displayName}
            </h1>
            <p className="truncate text-sm text-gn-text-secondary max-lg:text-[10px] max-lg:leading-tight">
              @{displayUsername}
            </p>
            {gamification ? (
              <p className="mt-0.5 text-xs font-medium text-gn-text-secondary max-lg:text-[10px]">
                {t("totalXp", { count: gamification.total_xp })}
              </p>
            ) : null}
            {profile.founding_player === true ||
            isPlayerPremium(profile) ||
            gamification?.freestyle_badge ? (
              <div className="mt-1 flex min-w-0 max-w-full flex-wrap items-center gap-1 max-lg:mt-0.5">
                {profile.founding_player === true ? <FoundingPlayerBadge /> : null}
                {isPlayerPremium(profile) ? <PlayerPremiumBadge /> : null}
                {gamification?.freestyle_badge ? (
                  <ChallengeKingBadge label={tChallenges("badgeName")} />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {userId && profile.id === userId ? (
          <div
            className="profile-actions box-border w-full max-w-full min-w-0 overflow-x-clip"
            data-profile-actions
          >
            <Link
              href="/settings/profile"
              className={`${GN_PRIMARY_BUTTON_CLASS} box-border min-h-11 w-full max-w-full min-w-0 max-lg:min-h-7 max-lg:rounded-lg max-lg:py-1 max-lg:text-xs`}
            >
              <span className="min-w-0 truncate">{tProfile("editProfile")}</span>
            </Link>
            <div className="mt-2">
              <ChallengeFriendButton fullWidth />
            </div>
          </div>
        ) : null}
        {userId && profile.id !== userId ? (
          <div className="mt-3 flex w-full min-w-0 max-w-full flex-col gap-3 max-lg:gap-2.5 sm:flex-row sm:flex-wrap sm:items-stretch">
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
            <div className="box-border w-full min-w-0 max-w-full sm:max-w-none sm:flex-1">
              <ChallengeFriendButton fullWidth />
            </div>
          </div>
        ) : null}
      </header>

      {hasPlayerDetails ? (
        <section
          aria-label={t("detailsSectionAria")}
          className={`${profileSectionClass} box-border w-full min-w-0 max-w-full space-y-4 max-lg:space-y-1 overflow-x-clip rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4 max-lg:rounded-lg max-lg:p-2 sm:p-5`}
        >
          <div className="grid min-w-0 grid-cols-2 gap-4 max-lg:gap-1">
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
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gn-text max-lg:text-xs">
                {playerBio}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className={`${profileSectionClass} max-lg:mt-0`}>
        <PlayerFollowSection profileUserId={profile.id} />
      </div>

      {showUploadFirstBanner ? (
        <UploadFirstVideoBanner variant="profile" onLater={dismissUploadFirst} />
      ) : null}

      <section
        className={`${profileSectionClass} max-lg:space-y-1`}
        aria-label={t("videosSectionAria")}
        data-profile-videos-section
        data-profile-videos-count={videos.length}
        {...(publicProfile
          ? {
              "data-public-profile-videos-section": "",
              "data-public-profile-videos-count": videos.length,
            }
          : {})}
      >
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gn-text-tertiary max-lg:mb-2">
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
            <p className="text-base font-semibold text-gn-text max-lg:text-sm">
              {tProfile("noVideosTitle")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gn-text-secondary">
              {tProfile("noVideosDescription")}
            </p>
          </div>
        ) : (
          <ProfileVideoGrid
            videos={videos}
            canDelete={canDeleteVideos}
            deletingVideoId={deletingVideoId}
            onDelete={onDeleteVideo}
            publicProfile={publicProfile}
          />
        )}
      </section>
    </div>,
  );
}
