"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { loadAndEnsureProfile } from "@/lib/supabase/profile";
import { tryConsumePendingReferralWithRetry } from "@/lib/supabase/referrals";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { DeleteAccountSection } from "@/components/profile/DeleteAccountSection";
import {
  APP_PROFILE_CONTENT_CLASS,
  APP_PROFILE_LOADING_INNER_CLASS,
} from "@/lib/layout/appShellClasses";
/** Own-profile "Uredi profil" — primary orange; layout/size unchanged via existing link classes. */
const OWN_PROFILE_EDIT_LINK_CLASS = [
  "[&_[data-profile-actions]_a[href*='settings/profile']]:!border-gn-accent",
  "[&_[data-profile-actions]_a[href*='settings/profile']]:!bg-gn-accent",
  "[&_[data-profile-actions]_a[href*='settings/profile']]:!text-black",
  "[&_[data-profile-actions]_a[href*='settings/profile']]:!font-semibold",
  "[&_[data-profile-actions]_a[href*='settings/profile']]:shadow-[0_8px_28px_-6px_rgba(249,115,22,0.45)]",
  "[&_[data-profile-actions]_a[href*='settings/profile']]:ring-1",
  "[&_[data-profile-actions]_a[href*='settings/profile']]:ring-white/10",
  "[&_[data-profile-actions]_a[href*='settings/profile']]:hover:!border-gn-accent",
  "[&_[data-profile-actions]_a[href*='settings/profile']]:hover:!bg-gn-accent-hover",
  "[&_[data-profile-actions]_a[href*='settings/profile']]:motion-safe:active:scale-[0.98]",
].join(" ");
import { PlayerPublicProfile } from "@/components/profile/PlayerPublicProfile";
import { ScoutOwnProfileView } from "@/components/profile/ScoutOwnProfileView";
import { normalizeAppPathname } from "@/lib/layout/normalizeAppPathname";
import type { Database } from "@/lib/supabase/client";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ScoutProfileRow = Database["public"]["Tables"]["scout_profiles"]["Row"];

const PROFILE_SCROLL_RESET_DELAYS_MS = [0, 100, 300, 600, 1000] as const;

function isProfileRoute(pathname: string): boolean {
  return normalizeAppPathname(pathname) === "/profile";
}

function resetProfileMainScroll() {
  if (typeof window === "undefined") return;
  if (!window.matchMedia("(max-width: 1023px)").matches) return;

  const main = document.querySelector("[data-app-main]");
  if (main instanceof HTMLElement) {
    main.scrollTop = 0;
    main.scrollLeft = 0;
    main.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return;
  }

  window.scrollTo(0, 0);
}

function scheduleProfileScrollResets(): () => void {
  resetProfileMainScroll();
  const raf1 = requestAnimationFrame(resetProfileMainScroll);
  const raf2 = requestAnimationFrame(() => {
    requestAnimationFrame(resetProfileMainScroll);
  });
  const timeoutIds = PROFILE_SCROLL_RESET_DELAYS_MS.map((delay) =>
    window.setTimeout(resetProfileMainScroll, delay),
  );

  return () => {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    timeoutIds.forEach((id) => window.clearTimeout(id));
  };
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
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!isProfileRoute(pathname)) return;
    if (typeof history === "undefined" || !("scrollRestoration" in history)) return;
    const prev = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = prev;
    };
  }, [pathname]);

  useEffect(() => {
    if (!isProfileRoute(pathname)) return;
    return scheduleProfileScrollResets();
  }, [pathname]);

  return (
    <div
      data-profile-shell
      data-own-profile-page
      className={[
        APP_PROFILE_CONTENT_CLASS,
        "overflow-x-clip lg:max-w-2xl lg:pb-8",
        /* Mobile only: welcome card is the sole upload CTA when empty; bottom nav covers uploads otherwise. */
        "max-lg:[&_[data-profile-actions]_a[href*='upload']]:hidden",
        OWN_PROFILE_EDIT_LINK_CLASS,
      ].join(" ")}
    >
      <div className="own-profile-page-inner box-border flex w-full min-w-0 max-w-full flex-col space-y-4 max-lg:space-y-3 max-lg:pt-0 max-lg:pb-0 lg:space-y-6 lg:pt-0 lg:pb-0">
        {children}
      </div>
    </div>
  );
}

export function OwnProfileView() {
  const tCommon = useTranslations("authCommon");
  const tPlayer = useTranslations("playerProfile");
  const tProfile = useTranslations("profile");
  const tProfileEditor = useTranslations("profileEditor");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showSavedBanner = searchParams.get("saved") === "1";
  const [playerSlug, setPlayerSlug] = useState<string | null>(null);
  const [scoutBundle, setScoutBundle] = useState<{
    user: UserRow;
    profile: ScoutProfileRow;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    if (!isProfileRoute(pathname)) return;
    return scheduleProfileScrollResets();
  }, [pathname]);

  useEffect(() => {
    if (!isProfileRoute(pathname)) return;
    if (!profileReady) return;
    return scheduleProfileScrollResets();
  }, [pathname, profileReady, playerSlug, scoutBundle, error]);

  useEffect(() => {
    let mounted = true;
    setProfileReady(false);
    void (async () => {
      const result = await loadAndEnsureProfile();
      if (!mounted) return;
      if (!result.success) {
        setError(result.error.message);
        setProfileReady(true);
        return;
      }
      if (result.data.role === "scout") {
        setScoutBundle({ user: result.data.user, profile: result.data.profile });
        setProfileReady(true);
        return;
      }
      const usernameFromProfile = result.data.profile.username?.trim() || null;
      const nextSlug = usernameFromProfile || result.data.user.id?.trim() || null;
      if (!nextSlug) {
        setError(tCommon("genericError"));
        setProfileReady(true);
        return;
      }
      setPlayerSlug(nextSlug);
      setProfileReady(true);
      void tryConsumePendingReferralWithRetry();
    })().catch((err) => {
      logFullSupabaseError("[OwnProfileView] loadAndEnsureProfile", err);
      if (mounted) {
        setError(tCommon("genericError"));
        setProfileReady(true);
      }
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
      <PlayerPublicProfile embedded playerSlug={playerSlug} />
      <DeleteAccountSection />
    </ProfilePageShell>
  );
}
