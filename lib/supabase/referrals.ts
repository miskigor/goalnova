import { supabase } from "@/lib/supabase/client";
import { devLog } from "@/lib/devLog";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { PITCHRUSCH_PREMIUM_UPDATED_EVENT } from "@/lib/supabase/premium";

export const PITCHRUSCH_PENDING_REFERRAL_KEY = "pitchrusch_pending_referral_code";
/** Last `goalnova_player_complete_referral` outcome JSON for mobile debugging (localStorage). */
export const PITCHRUSCH_LAST_REFERRAL_RESULT_KEY = "pitchrusch_last_referral_result";

export type ReferralDashboard = {
  referralCode: string | null;
  inviteCount: number;
  featuredPlayerUntil: string | null;
  grantedKeys: string[];
};

/** RPC reasons that clear pending code (no further retries). */
const DEFINITIVE_FAIL_REASONS = new Set([
  "invalid_code",
  "unknown_code",
  "self_referral",
  "referral_only_for_new_accounts",
]);

/** RPC / client reasons that keep pending and allow retries. */
const TEMPORARY_FAIL_REASONS = new Set([
  "not_authenticated",
  "no_player_profile",
  "not_player_role",
  "no_current_user",
  "session_missing",
  "rpc_transport",
]);

function dispatchPremiumUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PITCHRUSCH_PREMIUM_UPDATED_EVENT));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseRpcRow(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
    return data[0] as Record<string, unknown>;
  }
  return null;
}

function rpcOk(row: Record<string, unknown> | null): boolean {
  if (!row) return false;
  const v = row.ok;
  return v === true || v === "true";
}

function persistLastReferralResult(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const merged = { ...payload, at: new Date().toISOString() };
    localStorage.setItem(PITCHRUSCH_LAST_REFERRAL_RESULT_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
}

function storageWritePending(code: string) {
  try {
    sessionStorage.setItem(PITCHRUSCH_PENDING_REFERRAL_KEY, code);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(PITCHRUSCH_PENDING_REFERRAL_KEY, code);
  } catch {
    /* ignore */
  }
}

function storageClearPending() {
  try {
    sessionStorage.removeItem(PITCHRUSCH_PENDING_REFERRAL_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(PITCHRUSCH_PENDING_REFERRAL_KEY);
  } catch {
    /* ignore */
  }
}

export function rememberReferralCodeFromQuery(ref: string | null | undefined) {
  const raw = (ref ?? "").trim();
  const code = raw.toUpperCase();
  if (code.length < 4) {
    if (raw.length > 0) devLog("[referral] skip remember: ref too short", { raw });
    return;
  }
  storageWritePending(code);
  devLog("[referral] pending referral code saved (session + local)", { code });
}

export function peekPendingReferralCode(): string | null {
  try {
    let raw = sessionStorage.getItem(PITCHRUSCH_PENDING_REFERRAL_KEY);
    if (!(raw ?? "").trim()) {
      raw = localStorage.getItem(PITCHRUSCH_PENDING_REFERRAL_KEY);
    }
    const code = (raw ?? "").trim().toUpperCase();
    if (code.length >= 4) {
      storageWritePending(code);
      return code;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** session/local storage first, then auth user_metadata.pending_referral_code (email-confirm flow). */
export async function resolvePendingReferralCode(): Promise<string | null> {
  const fromStorage = peekPendingReferralCode();
  if (fromStorage) return fromStorage;

  try {
    const { data } = await supabase.auth.getUser();
    const meta = data.user?.user_metadata?.pending_referral_code;
    if (typeof meta === "string") {
      const code = meta.trim().toUpperCase();
      if (code.length >= 4) {
        storageWritePending(code);
        devLog("[referral] restored pending code from user_metadata", { code });
        return code;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPendingReferralCode() {
  storageClearPending();
  devLog("[referral] cleared pending referral code (session + local)");
}

/**
 * Poll until `users.role === 'player'` and a `player_profiles` row exists (handles replication lag).
 */
export async function waitUntilPlayerProfileReady(
  userId: string,
  options?: { maxMs?: number; stepMs?: number },
): Promise<boolean> {
  const maxMs = options?.maxMs ?? 15_000;
  const stepMs = options?.stepMs ?? 350;
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (!userErr && userRow?.role === "player") {
      const { data: profileRow, error: profileErr } = await supabase
        .from("player_profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!profileErr && profileRow?.id) {
        devLog("[referral] waitUntilPlayerProfileReady: ready", { userId });
        return true;
      }
    }

    await sleep(stepMs);
  }

  devLog("[referral] waitUntilPlayerProfileReady: timeout", { userId, maxMs });
  return false;
}

type OnceOutcome = "success" | "definitive_fail" | "temporary_fail" | "no_pending";

async function tryConsumePendingReferralOnce(): Promise<OnceOutcome> {
  const code = await resolvePendingReferralCode();
  if (!code) {
    persistLastReferralResult({ stage: "peek", outcome: "no_pending" });
    return "no_pending";
  }

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  if (authErr || !userId) {
    const reason = authErr ? "session_missing" : "no_current_user";
    persistLastReferralResult({
      stage: "auth",
      ok: false,
      reason,
      message: authErr?.message ?? null,
    });
    devLog("[referral] tryConsumeOnce: no session, keep pending", { reason });
    return "temporary_fail";
  }

  const { data, error } = await supabase.rpc("goalnova_player_complete_referral", {
    p_referral_code: code,
  });

  if (error) {
    logFullSupabaseError("[referrals] goalnova_player_complete_referral", error, { code });
    persistLastReferralResult({
      stage: "rpc_error",
      ok: false,
      reason: "rpc_transport",
      message: error.message,
      code: error.code,
    });
    devLog("[referral] tryConsumeOnce: RPC transport error, keep pending", error.message);
    return "temporary_fail";
  }

  const row = parseRpcRow(data);
  const reason = typeof row?.reason === "string" ? row.reason : "";
  const ok = rpcOk(row);

  persistLastReferralResult({
    stage: "rpc",
    ok,
    reason: reason || null,
    noop: row?.noop === true || row?.noop === "true",
    raw: row ?? null,
  });

  devLog("[referral] tryConsumeOnce: RPC body", { ok, reason, row });

  if (ok) {
    if (reason === "no_player_profile" || reason === "not_player_role") {
      return "temporary_fail";
    }
    clearPendingReferralCode();
    if (!row?.noop) {
      dispatchPremiumUpdated();
    }
    return "success";
  }

  if (DEFINITIVE_FAIL_REASONS.has(reason)) {
    clearPendingReferralCode();
    return "definitive_fail";
  }

  if (TEMPORARY_FAIL_REASONS.has(reason)) {
    return "temporary_fail";
  }

  devLog("[referral] tryConsumeOnce: unknown reason, treat as temporary", { reason });
  return "temporary_fail";
}

const RETRY_DELAYS_MS = [0, 1000, 2000, 4000, 8000, 15000];

/**
 * True when the signed-in user still needs to finish /role (no player/scout profile row yet).
 */
export async function needsRoleOnboardingPage(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return false;

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (userRow?.role === "scout") {
    const { data: scoutProfile } = await supabase
      .from("scout_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    return !scoutProfile?.id;
  }

  const { data: playerProfile } = await supabase
    .from("player_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  return !playerProfile?.id;
}

/**
 * Waits until player profile exists, then runs the full consume retry schedule.
 */
export async function tryConsumePendingReferralWhenPlayerReady(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!(await resolvePendingReferralCode())) return;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) return;

  await waitUntilPlayerProfileReady(auth.user.id, { maxMs: 20_000 });
  await tryConsumePendingReferralWithRetry();
}

/**
 * Reads pending code, calls RPC with backoff (0s, 1s, 2s, 4s, 8s, 15s) while outcome is temporary.
 */
export async function tryConsumePendingReferralWithRetry(): Promise<void> {
  if (typeof window === "undefined") return;

  if (!(await resolvePendingReferralCode())) {
    return;
  }

  devLog("[referral] tryConsumePendingReferralWithRetry: start");

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt]);

    const outcome = await tryConsumePendingReferralOnce();
    if (outcome === "success" || outcome === "definitive_fail" || outcome === "no_pending") {
      return;
    }
  }

  devLog("[referral] tryConsumePendingReferralWithRetry: exhausted retries (pending kept)");
}

/** @deprecated Prefer {@link tryConsumePendingReferralWithRetry}; kept for call sites — now runs full retry schedule. */
export async function tryConsumePendingReferral(): Promise<void> {
  await tryConsumePendingReferralWithRetry();
}

export async function fetchReferralDashboard(): Promise<{
  data: ReferralDashboard | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_player_referral_dashboard");
  if (error) {
    logFullSupabaseError("[referrals] goalnova_player_referral_dashboard", error);
    return { data: null, errorMessage: error.message };
  }
  const row = parseRpcRow(data);
  if (!row || !rpcOk(row)) {
    return { data: null, errorMessage: null };
  }
  const granted = row.granted_keys;
  const keys = Array.isArray(granted) ? granted.map((k) => String(k)) : [];
  const inviteCount =
    typeof row.invite_count === "number" ? row.invite_count : Number(row.invite_count ?? 0);
  devLog("[referral] dashboard invite_count", inviteCount);
  return {
    data: {
      referralCode: typeof row.referral_code === "string" ? row.referral_code : null,
      inviteCount,
      featuredPlayerUntil:
        typeof row.featured_player_until === "string" ? row.featured_player_until : null,
      grantedKeys: keys,
    },
    errorMessage: null,
  };
}
