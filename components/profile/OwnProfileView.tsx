"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { loadAndEnsureProfile } from "@/lib/supabase/profile";
import { tryConsumePendingReferralWithRetry } from "@/lib/supabase/referrals";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { DeleteAccountSection } from "@/components/profile/DeleteAccountSection";
import { ClubOwnProfileView } from "@/components/profile/ClubOwnProfileView";
import {
  APP_PROFILE_CONTENT_CLASS,
  APP_PROFILE_LOADING_INNER_CLASS,
} from "@/lib/layout/appShellClasses";
import { PlayerPublicProfile } from "@/components/profile/PlayerPublicProfile";
import { ScoutOwnProfileView } from "@/components/profile/ScoutOwnProfileView";
import { supabase, type Database } from "@/lib/supabase/client";
import { profileVideosDebug } from "@/lib/profile/profileVideosDebug";
import { scheduleProfilePageScrollReset } from "@/lib/profile/profilePageScrollReset";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ScoutProfileRow = Database["public"]["Tables"]["scout_profiles"]["Row"];

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin text-gn-accent`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
      />
    </svg>
  );
}

function ProfilePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-profile-shell
      data-own-profile-page
      className={[
        APP_PROFILE_CONTENT_CLASS,
        "overflow-x-clip lg:max-w-2xl lg:pb-8",
      ].join(" ")}
    >
      {/* Inner band — top inset comes from app shell / V2 content column only */}
      <div className="box-border flex w-full min-w-0 max-w-full flex-col space-y-4 max-lg:space-y-3 max-lg:pt-0 max-lg:pb-0 lg:pt-0 lg:pb-0">
        {children}
      </div>
    </div>
  );
}

export function OwnProfileView() {
  const pathname = usePathname();
  const tCommon = useTranslations("authCommon");
  const tPlayer = useTranslations("playerProfile");
  const tProfile = useTranslations("profile");
  const tProfileEditor = useTranslations("profileEditor");
  const searchParams = useSearchParams();
  const showSavedBanner = searchParams.get("saved") === "1";
  const [playerSlug, setPlayerSlug] = useState<string | null>(null);
  const [ownAvatarUrl, setOwnAvatarUrl] = useState<string | null>(null);
  const [scoutBundle, setScoutBundle] = useState<{
    user: UserRow;
    profile: ScoutProfileRow;
  } | null>(null);
  const [clubAccount, setClubAccount] = useState<{
    email: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    profileVideosDebug("OwnProfileView mounted", {
      path: typeof window !== "undefined" ? window.location.pathname : null,
    });
  }, []);

  useEffect(() => {
    if (pathname !== "/profile") return;
    return scheduleProfilePageScrollReset(pathname);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/profile") return;
    if (!playerSlug && !scoutBundle && !clubAccount) return;
    return scheduleProfilePageScrollReset(pathname);
  }, [pathname, playerSlug, scoutBundle, clubAccount]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const result = await loadAndEnsureProfile();
      if (!mounted) return;
      if (result.success && result.data.role === "club") {
        setClubAccount({
          email: result.data.user.email?.trim() || null,
          avatarUrl: result.data.user.avatar_url?.trim() || null,
        });
        return;
      }
      if (!result.success) {
        profileVideosDebug("loadAndEnsureProfile failed", {
          message: result.error.message,
        });
        const { data: sessionData } = await supabase.auth.getSession();
        const authId = sessionData.session?.user.id;
        if (authId) {
          const { data: userRow } = await supabase
            .from("users")
            .select("role, email")
            .eq("id", authId)
            .maybeSingle();
          if (!mounted) return;
          if (userRow?.role === "club") {
            setClubAccount({
              email: userRow.email?.trim() || sessionData.session?.user.email || null,
              avatarUrl: null,
            });
            return;
          }
        }
        setError(result.error.message);
        return;
      }
      if (result.data.role === "scout") {
        profileVideosDebug("route", {
          branch: "scout",
          note: "PlayerPublicProfile/video grid not used for scouts",
          userId: result.data.user.id,
        });
        setOwnAvatarUrl(result.data.user.avatar_url?.trim() || null);
        setScoutBundle({ user: result.data.user, profile: result.data.profile });
        return;
      }
      if (result.data.role !== "player") {
        return;
      }
      const usernameFromProfile = result.data.profile.username?.trim() || null;
      const nextSlug = usernameFromProfile || result.data.user.id?.trim() || null;
      if (!nextSlug) {
        profileVideosDebug("route", { branch: "player", error: "missing_slug" });
        setError(tCommon("genericError"));
        return;
      }
      setOwnAvatarUrl(result.data.user.avatar_url?.trim() || null);
      profileVideosDebug("route", {
        branch: "player",
        playerSlug: nextSlug,
        willRender: "PlayerPublicProfile",
      });
      setPlayerSlug(nextSlug);
      void tryConsumePendingReferralWithRetry();
    })().catch((err) => {
      logFullSupabaseError("[OwnProfileView] loadAndEnsureProfile", err);
      if (mounted) setError(tCommon("genericError"));
    });
    return () => {
      mounted = false;
    };
  }, [tCommon]);

  const savedBanner = showSavedBanner ? (
    <div
      role="status"
      className="box-border w-full min-w-0 max-w-full rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/95"
    >
      {tProfileEditor("saved")}
    </div>
  ) : null;

  if (clubAccount) {
    return (
      <ProfilePageShell>
        {savedBanner}
        <ClubOwnProfileView email={clubAccount.email} avatarUrl={clubAccount.avatarUrl} />
        <DeleteAccountSection />
      </ProfilePageShell>
    );
  }

  if (error) {
    return (
      <ProfilePageShell>
        <div className="box-border w-full min-w-0 max-w-full space-y-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4">
          <p className="break-words text-sm text-gn-text-secondary">{tPlayer("loadFailed")}</p>
          <Link
            href="/settings/profile"
            className="text-sm font-medium text-gn-accent hover:underline"
          >
            {tProfile("editProfile")}
          </Link>
        </div>
      </ProfilePageShell>
    );
  }

  if (scoutBundle) {
    return (
      <ProfilePageShell>
        {savedBanner}
        <ScoutOwnProfileView embedded user={scoutBundle.user} profile={scoutBundle.profile} />
        <DeleteAccountSection />
      </ProfilePageShell>
    );
  }

  if (!playerSlug) {
    return (
      <ProfilePageShell>
        <div className={APP_PROFILE_LOADING_INNER_CLASS} role="status">
          <Spinner className="h-8 w-8" />
          {tCommon("loading")}
        </div>
      </ProfilePageShell>
    );
  }

  return (
    <ProfilePageShell>
      {savedBanner}
      <PlayerPublicProfile
        embedded
        playerSlug={playerSlug}
        prefetchedAvatarUrl={ownAvatarUrl}
      />
      <DeleteAccountSection />
    </ProfilePageShell>
  );
}
