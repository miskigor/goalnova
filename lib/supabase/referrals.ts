import { supabase } from "@/lib/supabase/client";
import { devLog } from "@/lib/devLog";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { PITCHRUSCH_PREMIUM_UPDATED_EVENT } from "@/lib/supabase/premium";

export const PITCHRUSCH_PENDING_REFERRAL_KEY = "pitchrusch_pending_referral_code";

export type ReferralDashboard = {
  referralCode: string | null;
  inviteCount: number;
  featuredPlayerUntil: string | null;
  grantedKeys: string[];
};

function dispatchPremiumUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PITCHRUSCH_PREMIUM_UPDATED_EVENT));
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

export function rememberReferralCodeFromQuery(ref: string | null | undefined) {
  const raw = (ref ?? "").trim();
  const code = raw.toUpperCase();
  if (code.length < 4) {
    if (raw.length > 0) devLog("[referral] skip remember: ref too short", { raw });
    return;
  }
  try {
    sessionStorage.setItem(PITCHRUSCH_PENDING_REFERRAL_KEY, code);
    devLog("[referral] pending referral code saved to sessionStorage", { code });
  } catch (e) {
    devLog("[referral] sessionStorage.setItem failed", e);
  }
}

export function peekPendingReferralCode(): string | null {
  try {
    const raw = sessionStorage.getItem(PITCHRUSCH_PENDING_REFERRAL_KEY);
    const code = (raw ?? "").trim().toUpperCase();
    return code.length >= 4 ? code : null;
  } catch {
    return null;
  }
}

export function clearPendingReferralCode() {
  try {
    sessionStorage.removeItem(PITCHRUSCH_PENDING_REFERRAL_KEY);
    devLog("[referral] cleared pending referral code from sessionStorage");
  } catch {
    /* ignore */
  }
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

/**
 * Links the signed-in player to their referrer (once) and applies milestone rewards server-side.
 * Clears sessionStorage pending code only after a definitive RPC outcome (success, unknown code,
 * invalid code, or referral_only_for_new_accounts). Does not clear on RPC transport errors so the
 * client can retry (e.g. after navigation to /profile or AppShell mount).
 */
export async function tryConsumePendingReferral(): Promise<void> {
  const code = peekPendingReferralCode();
  if (!code) {
    devLog("[referral] tryConsumePendingReferral: no pending code in sessionStorage");
    return;
  }

  devLog("[referral] tryConsumePendingReferral: starting", { code });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) {
    devLog("[referral] tryConsumePendingReferral: not signed in, keeping pending code");
    return;
  }

  const { data, error } = await supabase.rpc("goalnova_player_complete_referral", {
    p_referral_code: code,
  });

  if (error) {
    logFullSupabaseError("[referrals] goalnova_player_complete_referral", error, { code });
    devLog("[referral] RPC error (pending code NOT cleared, will retry)", error.message);
    return;
  }

  const row = parseRpcRow(data);
  const reason = typeof row?.reason === "string" ? row.reason : "";
  const ok = rpcOk(row);

  devLog("[referral] goalnova_player_complete_referral result", { ok, reason, raw: row });

  if (!ok && reason === "referral_only_for_new_accounts") {
    clearPendingReferralCode();
    return;
  }

  if (!ok && (reason === "not_player_role" || reason === "no_player_profile")) {
    devLog("[referral] defer referral completion until player role + profile exist", { reason });
    return;
  }

  if (!ok && (reason === "unknown_code" || reason === "invalid_code")) {
    clearPendingReferralCode();
    return;
  }

  if (!ok) {
    devLog("[referral] RPC returned ok=false (pending code kept for retry)", { reason });
    return;
  }

  if (reason === "no_player_profile" || reason === "not_player_role") {
    return;
  }

  clearPendingReferralCode();
  if (!row?.noop) {
    dispatchPremiumUpdated();
  }
}
