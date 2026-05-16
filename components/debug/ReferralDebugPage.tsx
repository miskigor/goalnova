"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { isDev } from "@/lib/devLog";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  PITCHRUSCH_LAST_REFERRAL_RESULT_KEY,
  PITCHRUSCH_PENDING_REFERRAL_KEY,
  peekPendingReferralCode,
  tryConsumePendingReferralWithRetry,
} from "@/lib/supabase/referrals";
import { useAdminAccess } from "@/hooks/useAdminAccess";

type Snapshot = {
  userId: string | null;
  email: string | null;
  role: string | null;
  hasPlayerProfile: boolean;
  referralCode: string | null;
};

function readStorageKey(store: Storage, key: string): string | null {
  try {
    const v = store.getItem(key);
    return v === null || v === "" ? null : v;
  } catch {
    return null;
  }
}

function readLastResultJson(): string | null {
  try {
    return localStorage.getItem(PITCHRUSCH_LAST_REFERRAL_RESULT_KEY);
  } catch {
    return null;
  }
}

export function ReferralDebugPage() {
  const tCommon = useTranslations("common");
  const { loaded: adminLoaded, isAdmin } = useAdminAccess();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionPending, setSessionPending] = useState<string | null>(null);
  const [localPending, setLocalPending] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [peeked, setPeeked] = useState<string | null>(null);
  const [metaPending, setMetaPending] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const [afterRetryJson, setAfterRetryJson] = useState<string | null>(null);

  const refreshStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    setSessionPending(readStorageKey(sessionStorage, PITCHRUSCH_PENDING_REFERRAL_KEY));
    setLocalPending(readStorageKey(localStorage, PITCHRUSCH_PENDING_REFERRAL_KEY));
    setLastResult(readLastResultJson());
    setPeeked(peekPendingReferralCode());
  }, []);

  const loadSnapshot = useCallback(async () => {
    setLoadError(null);
    try {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        setLoadError(authErr.message);
        setSnapshot(null);
        return;
      }
      const uid = auth.user?.id ?? null;
      const email = auth.user?.email ?? null;
      const metaRef = auth.user?.user_metadata?.pending_referral_code;
      setMetaPending(typeof metaRef === "string" && metaRef.trim() ? metaRef.trim().toUpperCase() : null);

      if (!uid) {
        setSnapshot({
          userId: null,
          email,
          role: null,
          hasPlayerProfile: false,
          referralCode: null,
        });
        return;
      }

      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      if (userErr) {
        logFullSupabaseError("[ReferralDebug] users select", userErr);
        setLoadError(userErr.message);
      }

      const { data: profileRow, error: profileErr } = await supabase
        .from("player_profiles")
        .select("id, referral_code")
        .eq("id", uid)
        .maybeSingle();

      if (profileErr) {
        logFullSupabaseError("[ReferralDebug] player_profiles select", profileErr);
        if (!userErr) setLoadError(profileErr.message);
      }

      setSnapshot({
        userId: uid,
        email,
        role: (userRow?.role as string | undefined) ?? null,
        hasPlayerProfile: Boolean(profileRow?.id),
        referralCode:
          typeof profileRow?.referral_code === "string" ? profileRow.referral_code : null,
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Unknown error");
      setSnapshot(null);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
    refreshStorage();
  }, [loadSnapshot, refreshStorage]);

  if (!isDev && !adminLoaded) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6 text-sm text-gn-text-secondary">
        <p>{tCommon("loadingEllipsis")}</p>
      </div>
    );
  }

  if (!isDev && adminLoaded && !isAdmin) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6 text-sm text-gn-text">
        <h1 className="text-lg font-semibold">Referral debug</h1>
        <p className="text-gn-text-secondary">
          This page is only available in development or to staff. Return to{" "}
          <Link href="/home" className="text-gn-accent underline">
            home
          </Link>
          .
        </p>
      </div>
    );
  }

  async function onRetry() {
    setRetryBusy(true);
    setAfterRetryJson(null);
    try {
      await tryConsumePendingReferralWithRetry();
      refreshStorage();
      const raw = readLastResultJson();
      setAfterRetryJson(raw);
      await loadSnapshot();
    } finally {
      setRetryBusy(false);
    }
  }

  let lastResultPretty = lastResult;
  if (lastResult) {
    try {
      lastResultPretty = JSON.stringify(JSON.parse(lastResult), null, 2);
    } catch {
      /* keep raw */
    }
  }

  let afterPretty = afterRetryJson;
  if (afterRetryJson) {
    try {
      afterPretty = JSON.stringify(JSON.parse(afterRetryJson), null, 2);
    } catch {
      /* keep raw */
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 text-sm text-gn-text">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Referral debug</h1>
        <p className="text-xs text-gn-text-tertiary">
          {isDev ? "Development build" : "Staff only"} — internal diagnostics
        </p>
      </header>

      {loadError ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/20 px-3 py-2 text-red-200">{loadError}</p>
      ) : null}

      <section className="space-y-2 rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gn-text-tertiary">User</h2>
        <dl className="grid gap-1 font-mono text-xs sm:grid-cols-[10rem_1fr]">
          <dt className="text-gn-text-tertiary">user id</dt>
          <dd className="break-all">{snapshot?.userId ?? "—"}</dd>
          <dt className="text-gn-text-tertiary">email</dt>
          <dd className="break-all">{snapshot?.email ?? "—"}</dd>
          <dt className="text-gn-text-tertiary">public.users.role</dt>
          <dd>{snapshot?.role ?? "—"}</dd>
          <dt className="text-gn-text-tertiary">player_profile exists</dt>
          <dd>{snapshot ? (snapshot.hasPlayerProfile ? "yes" : "no") : "—"}</dd>
          <dt className="text-gn-text-tertiary">referral_code</dt>
          <dd className="break-all">{snapshot?.referralCode ?? "—"}</dd>
        </dl>
      </section>

      <section className="space-y-2 rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gn-text-tertiary">Pending storage</h2>
        <dl className="grid gap-1 font-mono text-xs sm:grid-cols-[10rem_1fr]">
          <dt className="text-gn-text-tertiary">sessionStorage</dt>
          <dd className="break-all">{sessionPending ?? "—"}</dd>
          <dt className="text-gn-text-tertiary">localStorage</dt>
          <dd className="break-all">{localPending ?? "—"}</dd>
          <dt className="text-gn-text-tertiary">peekPendingReferralCode()</dt>
          <dd className="break-all">{peeked ?? "—"}</dd>
          <dt className="text-gn-text-tertiary">user_metadata.pending_referral_code</dt>
          <dd className="break-all">{metaPending ?? "—"}</dd>
        </dl>
      </section>

      <section className="space-y-2 rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gn-text-tertiary">
          pitchrusch_last_referral_result
        </h2>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/40 p-3 text-xs text-gn-text-secondary">
          {lastResultPretty ?? "—"}
        </pre>
      </section>

      <section className="space-y-3">
        <button
          type="button"
          disabled={retryBusy}
          onClick={() => void onRetry()}
          className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
        >
          {retryBusy ? "Running…" : "Retry referral consume"}
        </button>
        {afterRetryJson ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gn-text-tertiary">
              RPC snapshot after click (last stored result)
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/40 p-3 text-xs text-emerald-100/90">
              {afterPretty}
            </pre>
          </div>
        ) : null}
      </section>

      <p className="text-xs text-gn-text-tertiary">
        <Link href="/benefits" className="text-gn-accent underline">
          Benefits
        </Link>
        {" · "}
        <Link href="/home" className="text-gn-accent underline">
          Home
        </Link>
      </p>
    </div>
  );
}
