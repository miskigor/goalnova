"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  checkIsFollowing,
  fetchFollowCountsForUser,
  followUser,
  unfollowUser,
} from "@/lib/supabase/follows";

type Props = { profileUserId: string };

function countsForUi(
  counts: Awaited<ReturnType<typeof fetchFollowCountsForUser>>
): { followers: number; following: number } {
  return {
    followers: counts.followers ?? 0,
    following: counts.following ?? 0,
  };
}

export function PlayerFollowSection({ profileUserId }: Props) {
  const t = useTranslations("follow");

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCountError, setFollowersCountError] = useState<string | null>(
    null
  );
  const [followingCountError, setFollowingCountError] = useState<string | null>(
    null
  );

  const [isFollowing, setIsFollowing] = useState(false);

  const [loading, setLoading] = useState(true);
  /** Entire section failed unexpectedly — still show safe defaults. */
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [followStateError, setFollowStateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const applyCounts = useCallback(
    (counts: Awaited<ReturnType<typeof fetchFollowCountsForUser>>) => {
      const { followers: f, following: fo } = countsForUi(counts);
      setFollowers(f);
      setFollowingCount(fo);
      if (counts.followersError) {
        logFullSupabaseError(
          "PlayerFollowSection: followers count",
          new Error(counts.followersError),
          { profileUserId },
        );
      }
      if (counts.followingError) {
        logFullSupabaseError(
          "PlayerFollowSection: following count",
          new Error(counts.followingError),
          { profileUserId },
        );
      }
      setFollowersCountError(counts.followersError);
      setFollowingCountError(counts.followingError);
    },
    [profileUserId],
  );

  const reconcileFromServer = useCallback(async () => {
    try {
      const counts = await fetchFollowCountsForUser(profileUserId);
      applyCounts(counts);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        logFullSupabaseError("PlayerFollowSection: reconcile getUser", authErr);
      }

      const vid = authData.user?.id ?? null;
      if (vid && vid !== profileUserId) {
        const check = await checkIsFollowing(vid, profileUserId);
        if (check.errorMessage) {
          logFullSupabaseError(
            "PlayerFollowSection: checkIsFollowing (reconcile)",
            new Error(check.errorMessage),
            { profileUserId, viewerId: vid },
          );
          setFollowStateError(check.errorMessage);
        } else {
          setIsFollowing(check.isFollowing);
          setFollowStateError(null);
        }
      } else {
        setIsFollowing(false);
        setFollowStateError(null);
      }
    } catch (e) {
      logFullSupabaseError("PlayerFollowSection: reconcileFromServer", e, {
        profileUserId,
      });
    }
  }, [applyCounts, profileUserId]);

  const load = useCallback(
    async (mode: "full" | "silent") => {
      if (mode === "full") {
        setLoading(true);
        setSectionError(null);
        setFollowersCountError(null);
        setFollowingCountError(null);
        setFollowStateError(null);
        setActionError(null);
      }

      try {
        const { data: authData, error: authErr } =
          await supabase.auth.getUser();
        if (authErr) {
          logFullSupabaseError("PlayerFollowSection: load getUser", authErr);
        }

        const vid = authData.user?.id ?? null;
        setViewerId(vid);

        const counts = await fetchFollowCountsForUser(profileUserId);
        applyCounts(counts);

        if (vid && vid !== profileUserId) {
          const check = await checkIsFollowing(vid, profileUserId);
          if (check.errorMessage) {
            logFullSupabaseError(
              "PlayerFollowSection: checkIsFollowing (load)",
              new Error(check.errorMessage),
              { profileUserId, viewerId: vid },
            );
            setFollowStateError(check.errorMessage);
            if (mode === "full") {
              setIsFollowing(false);
            }
          } else {
            setIsFollowing(check.isFollowing);
            setFollowStateError(null);
          }
        } else {
          setIsFollowing(false);
          setFollowStateError(null);
        }
      } catch (e) {
        logFullSupabaseError("PlayerFollowSection: load", e, {
          profileUserId,
          mode,
        });
        setSectionError(t("sectionLoadError"));
        setFollowers(0);
        setFollowingCount(0);
        setFollowersCountError(null);
        setFollowingCountError(null);
        setFollowStateError(null);
        setIsFollowing(false);
        try {
          const { data: authData } = await supabase.auth.getUser();
          setViewerId(authData.user?.id ?? null);
        } catch {
          setViewerId(null);
        }
      } finally {
        setAuthReady(true);
        if (mode === "full") {
          setLoading(false);
        }
      }
    },
    [applyCounts, profileUserId, t]
  );

  useEffect(() => {
    void load("full");
  }, [load]);

  const isAuthenticated = Boolean(viewerId);
  const isOwnProfile = isAuthenticated && viewerId === profileUserId;
  const showFollowButton =
    authReady && isAuthenticated && !isOwnProfile;

  const buttonDisabled =
    !showFollowButton ||
    actionPending ||
    Boolean(followStateError);

  const showLoginToFollow =
    authReady && !loading && !isAuthenticated && !isOwnProfile;

  const countsPartiallyUnknown = Boolean(
    followersCountError || followingCountError
  );

  async function onToggleFollow() {
    if (!viewerId || viewerId === profileUserId || actionPending) return;
    if (followStateError) return;

    setActionError(null);

    try {
      if (isFollowing) {
        const prevFollowing = isFollowing;
        const prevFollowers = followers;
        setIsFollowing(false);
        setFollowers((n) => Math.max(0, n - 1));
        setActionPending(true);
        const res = await unfollowUser(viewerId, profileUserId);
        setActionPending(false);
        if (!res.ok) {
          if (res.errorMessage) {
            logFullSupabaseError(
              "PlayerFollowSection: unfollowUser",
              new Error(res.errorMessage),
              { profileUserId, viewerId },
            );
          }
          setIsFollowing(prevFollowing);
          setFollowers(prevFollowers);
          setActionError(t("actionError"));
          void reconcileFromServer();
          return;
        }
        return;
      }

      const prevFollowing = isFollowing;
      const prevFollowers = followers;
      setIsFollowing(true);
      setFollowers((n) => n + 1);
      setActionPending(true);
      const res = await followUser(viewerId, profileUserId);
      setActionPending(false);
      if (!res.ok) {
        if (res.errorMessage) {
          logFullSupabaseError(
            "PlayerFollowSection: followUser",
            new Error(res.errorMessage),
            { profileUserId, viewerId },
          );
        }
        setIsFollowing(prevFollowing);
        setFollowers(prevFollowers);
        setActionError(t("actionError"));
        void reconcileFromServer();
        return;
      }

      if (res.duplicate) {
        setIsFollowing(true);
        void reconcileFromServer();
        return;
      }
    } catch (e) {
      setActionPending(false);
      logFullSupabaseError("PlayerFollowSection: onToggleFollow", e, {
        profileUserId,
      });
      setActionError(t("actionError"));
      void reconcileFromServer();
    }
  }

  const hasRecoverableError = Boolean(
    followersCountError ||
      followingCountError ||
      followStateError ||
      sectionError
  );

  return (
    <div className="min-w-0 max-w-full rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4 text-end sm:text-start">
      {loading ? (
        <p className="text-sm text-gn-text-secondary" role="status">
          {t("loading")}
        </p>
      ) : (
        <>
          {sectionError ? (
            <p role="alert" className="mb-3 text-sm text-amber-200/90">
              {sectionError}
            </p>
          ) : null}

          {followersCountError || followingCountError || followStateError ? (
            <p role="alert" className="mb-3 text-sm text-amber-200/90">
              {t("countsPartialLoadError")}
            </p>
          ) : null}

          {countsPartiallyUnknown && !sectionError ? (
            <p className="mb-2 text-xs text-gn-text-tertiary" role="note">
              {t("countsFallbackNote")}
            </p>
          ) : null}

          <p
            className="break-words text-sm text-gn-text-secondary"
            aria-label={t("countsAria", {
              followers: followers.toLocaleString(),
              following: followingCount.toLocaleString(),
            })}
          >
            <span className="font-medium text-gn-text-primary">
              {followers.toLocaleString()}
            </span>{" "}
            {t("followersLabel")}
            <span className="mx-2 text-gn-text-tertiary" aria-hidden>
              ·
            </span>
            <span className="font-medium text-gn-text-primary">
              {followingCount.toLocaleString()}
            </span>{" "}
            {t("followingLabel")}
          </p>

          {showFollowButton ? (
            <div className="mt-3 space-y-2 sm:text-start">
              <button
                type="button"
                disabled={buttonDisabled}
                aria-busy={actionPending}
                aria-disabled={buttonDisabled}
                onClick={() => void onToggleFollow()}
                className="rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:bg-gn-accent-hover disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionPending
                  ? t("working")
                  : isFollowing
                    ? t("unfollow")
                    : t("follow")}
              </button>
              {actionError ? (
                <p role="alert" className="text-sm text-red-300/90">
                  {actionError}
                </p>
              ) : null}
            </div>
          ) : null}

          {showLoginToFollow ? (
            <p className="mt-3 break-words text-start text-sm text-gn-text-secondary">
              {t("loginToFollowPrefix")}{" "}
              <Link
                href="/login"
                className="font-medium text-gn-accent underline-offset-2 hover:underline"
              >
                {t("loginToFollowLink")}
              </Link>
            </p>
          ) : null}

          {hasRecoverableError && !loading ? (
            <button
              type="button"
              className="mt-3 text-xs font-medium text-gn-accent hover:underline disabled:opacity-50"
              disabled={actionPending}
              onClick={() => void load("full")}
            >
              {t("retryCounts")}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
