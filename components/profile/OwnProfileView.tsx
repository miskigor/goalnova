"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { loadAndEnsureProfile } from "@/lib/supabase/profile";
import { tryConsumePendingReferralWithRetry } from "@/lib/supabase/referrals";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { DeleteAccountSection } from "@/components/profile/DeleteAccountSection";
import { APP_PROFILE_SHELL_CLASS } from "@/lib/layout/appShellClasses";
import { PlayerPublicProfile } from "@/components/profile/PlayerPublicProfile";
import { ScoutOwnProfileView } from "@/components/profile/ScoutOwnProfileView";
import type { Database } from "@/lib/supabase/client";

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
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z" />
    </svg>
  );
}

export function OwnProfileView() {
  const tCommon = useTranslations("authCommon");
  const tPlayer = useTranslations("playerProfile");
  const tProfile = useTranslations("profile");
  const tProfileEditor = useTranslations("profileEditor");
  const searchParams = useSearchParams();
  const showSavedBanner = searchParams.get("saved") === "1";
  const [playerSlug, setPlayerSlug] = useState<string | null>(null);
  const [scoutBundle, setScoutBundle] = useState<{
    user: UserRow;
    profile: ScoutProfileRow;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const result = await loadAndEnsureProfile();
      if (!mounted) return;
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      if (result.data.role === "scout") {
        setScoutBundle({ user: result.data.user, profile: result.data.profile });
        return;
      }
      const usernameFromProfile = result.data.profile.username?.trim() || null;
      const nextSlug = usernameFromProfile || result.data.user.id?.trim() || null;
      if (!nextSlug) {
        setError(tCommon("genericError"));
        return;
      }
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

  if (error) {
    return (
      <div className="space-y-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4">
        <p className="text-sm text-gn-text-secondary">{tPlayer("loadFailed")}</p>
        <Link
          href="/settings/profile"
          className="text-sm font-medium text-gn-accent hover:underline"
        >
          {tProfile("editProfile")}
        </Link>
      </div>
    );
  }

  if (scoutBundle) {
    return (
      <div data-profile-shell className={APP_PROFILE_SHELL_CLASS}>
        {showSavedBanner ? (
          <div
            role="status"
            className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/95"
          >
            {tProfileEditor("saved")}
          </div>
        ) : null}
        <ScoutOwnProfileView user={scoutBundle.user} profile={scoutBundle.profile} />
        <DeleteAccountSection />
      </div>
    );
  }

  if (!playerSlug) {
    return (
      <div className="flex min-h-[35vh] items-center justify-center gap-2 text-sm text-gn-text-secondary">
        <Spinner />
        {tCommon("loading")}
      </div>
    );
  }

  return (
    <div data-profile-shell className={APP_PROFILE_SHELL_CLASS}>
      {showSavedBanner ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/95"
        >
          {tProfileEditor("saved")}
        </div>
      ) : null}
      <PlayerPublicProfile playerSlug={playerSlug} />
      <DeleteAccountSection />
    </div>
  );
}
