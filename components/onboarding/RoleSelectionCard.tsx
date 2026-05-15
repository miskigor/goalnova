"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { devError } from "@/lib/devLog";
import { supabase } from "@/lib/supabase/client";
import { signOut } from "@/lib/supabase/auth";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { ensureOnboardingNotificationsForRole } from "@/lib/supabase/onboardingNotifications";
import {
  rememberReferralCodeFromQuery,
  tryConsumePendingReferralWithRetry,
  waitUntilPlayerProfileReady,
} from "@/lib/supabase/referrals";
import { InviteFriendsSection } from "@/components/referrals/InviteFriendsSection";

type Role = "player" | "scout";

type SupabaseErrorShape = {
  message?: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

function isMissingScoutApplyFullNameColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as SupabaseErrorShape;
  if (e.code !== "PGRST204") return false;
  const msg = String(e.message ?? "").toLowerCase();
  return msg.includes("scout_apply_full_name") && msg.includes("users");
}

function isSchemaCacheColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as SupabaseErrorShape;
  if (e.code !== "PGRST204") return false;
  const msg = String(e.message ?? "").toLowerCase();
  return msg.includes("column") && msg.includes("schema cache");
}

function RoleSpinner() {
  return (
    <svg
      className="mx-auto h-8 w-8 animate-spin text-gn-accent"
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

export function RoleSelectionCard() {
  const t = useTranslations("onboardingRole");
  const tCommon = useTranslations("authCommon");
  const router = useRouter();

  const [selected, setSelected] = useState<Role>("player");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => !loading && !checking, [loading, checking]);

  const supabaseErrorMessage = useCallback(
    (err: unknown): string => {
      if (!err || typeof err !== "object") return t("unknownError");
      const e = err as SupabaseErrorShape;
      if (isSchemaCacheColumnError(err)) return t("requestFailedGeneric");
      return e.message ? String(e.message) : t("requestFailedGeneric");
    },
    [t],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    rememberReferralCodeFromQuery(ref);
  }, []);

  useEffect(() => {
    // If already onboarded (role is set AND corresponding profile exists), skip.
    async function init() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!user?.id) {
          setChecking(false);
          return;
        }

        const { data: userRow } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role = (userRow?.role as Role | undefined) ?? undefined;
        if (role === "player" || role === "scout") {
          setSelected(role);
        }
      } catch (e) {
        devError("RoleSelection init error", e);
      } finally {
        setChecking(false);
      }
    }

    init();
  }, []);

  async function chooseRole(role: Role) {
    setError(null);
    setLoading(true);
    try {
      setSelected(role);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        logFullSupabaseError("[RoleSelection] getUser error", authError);
        setError(supabaseErrorMessage(authError));
        return;
      }

      const authUser = authData.user;
      const userId = authUser?.id;
      const signupFullNameRaw =
        typeof authUser?.user_metadata?.full_name === "string"
          ? authUser.user_metadata.full_name
          : "";
      const signupFullName = signupFullNameRaw.trim();

      if (!userId) {
        setError(t("notSignedIn"));
        return;
      }

      // 1) Save role to users
      const usersPayload: {
        id: string;
        email: string | null;
        role: Role;
        language_preference: string;
        scout_apply_full_name?: string;
      } = {
        id: userId,
        email: authUser.email ?? null,
        role,
        language_preference: "en",
        ...(signupFullName ? { scout_apply_full_name: signupFullName } : {}),
      };
      let { error: usersUpsertError } = await supabase
        .from("users")
        .upsert(usersPayload, { onConflict: "id" });
      if (usersUpsertError && isMissingScoutApplyFullNameColumn(usersUpsertError)) {
        // Backward compatibility for DBs where this optional column is not yet migrated.
        const fallbackPayload = { ...usersPayload };
        delete fallbackPayload.scout_apply_full_name;
        const retry = await supabase
          .from("users")
          .upsert(fallbackPayload, { onConflict: "id" });
        usersUpsertError = retry.error;
      }

      if (usersUpsertError) {
        logFullSupabaseError("[RoleSelection] users upsert error", usersUpsertError);
        setError(supabaseErrorMessage(usersUpsertError));
        return;
      }

      const { data: usersRow, error: usersSelectError } = await supabase
        .from("users")
        .select("id, role, language_preference")
        .eq("id", userId)
        .maybeSingle();

      if (usersSelectError) {
        logFullSupabaseError("[RoleSelection] users select error", usersSelectError);
        setError(supabaseErrorMessage(usersSelectError));
        return;
      }

      if (!usersRow?.id || usersRow.role !== role) {
        setError(t("roleSaveUnconfirmed"));
        return;
      }

      // 2) Ensure profile row exists
      const profileTable = role === "player" ? "player_profiles" : "scout_profiles";
      const { error: profileUpsertError } = await supabase
        .from(profileTable)
        .upsert(
          role === "player" && signupFullName
            ? { id: userId, full_name: signupFullName }
            : { id: userId },
          { onConflict: "id" },
        );

      if (profileUpsertError) {
        logFullSupabaseError(
          `[RoleSelection] ${profileTable} upsert error`,
          profileUpsertError,
        );
        setError(supabaseErrorMessage(profileUpsertError));
        return;
      }

      const { data: profileRow, error: profileSelectError } = await supabase
        .from(profileTable)
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (profileSelectError) {
        logFullSupabaseError(
          `[RoleSelection] ${profileTable} select error`,
          profileSelectError,
        );
        setError(supabaseErrorMessage(profileSelectError));
        return;
      }

      if (!profileRow?.id) {
        setError(t("profileSetupUnconfirmed"));
        return;
      }

      void ensureOnboardingNotificationsForRole(supabase, userId, role);

      if (role === "player") {
        try {
          await waitUntilPlayerProfileReady(userId);
          await tryConsumePendingReferralWithRetry();
        } catch (e) {
          devError("[RoleSelection] referral consume failed", e);
        }
      }

      router.replace(role === "scout" ? "/scout-apply" : "/profile");
    } catch (e) {
      devError("RoleSelection save error", e);
      setError(
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : tCommon("genericError")
      );
    } finally {
      setLoading(false);
    }
  }

  async function onStartOver() {
    setError(null);
    setLoading(true);
    try {
      await signOut();
      router.replace("/signup");
    } catch (e) {
      devError("RoleSelection logout error", e);
      setError(tCommon("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-sm sm:p-8">
      {checking ? (
        <div
          className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-8 text-sm text-gn-text-secondary"
          role="status"
        >
          <RoleSpinner />
          {tCommon("loading")}
        </div>
      ) : null}

      {!checking ? (
      <>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gn-accent/90">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-gn-text">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-gn-text-secondary">{t("subtitle")}</p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          disabled={!canSubmit}
          aria-busy={loading}
          onClick={() => void chooseRole("player")}
          className={`block w-full rounded-2xl border px-4 py-4 text-left transition-colors disabled:opacity-60 ${
            selected === "player"
              ? "border-gn-accent/60 bg-gn-surface-elevated"
              : "border-gn-border-subtle bg-gn-surface/40 hover:border-gn-border"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gn-text">{t("player")}</p>
              <p className="mt-1 text-sm text-gn-text-secondary">
                {t("playerHint")}
              </p>
            </div>
            <span
              className={`size-4 rounded-full border ${
                selected === "player"
                  ? "border-gn-accent bg-gn-accent"
                  : "border-white/20"
              }`}
              aria-hidden
            />
          </div>
        </button>

        <button
          type="button"
          disabled={!canSubmit}
          aria-busy={loading}
          onClick={() => void chooseRole("scout")}
          className={`block w-full rounded-2xl border px-4 py-4 text-left transition-colors disabled:opacity-60 ${
            selected === "scout"
              ? "border-gn-accent/60 bg-gn-surface-elevated"
              : "border-gn-border-subtle bg-gn-surface/40 hover:border-gn-border"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gn-text">{t("scout")}</p>
              <p className="mt-1 text-sm text-gn-text-secondary">
                {t("scoutHint")}
              </p>
              {selected === "scout" ? (
                <p className="mt-2 text-xs font-medium text-gn-accent">
                  {t("scoutApplyNotice")}
                </p>
              ) : null}
            </div>
            <span
              className={`size-4 rounded-full border ${
                selected === "scout"
                  ? "border-gn-accent bg-gn-accent"
                  : "border-white/20"
              }`}
              aria-hidden
            />
          </div>
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-gn-accent/30 bg-gn-surface/40 px-3.5 py-2 text-sm text-gn-text-secondary"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-8">
        <InviteFriendsSection />
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void onStartOver()}
        className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-gn-text-secondary transition-colors hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-60"
      >
        {t("startOver")}
      </button>
      </>
      ) : null}
    </div>
  );
}

