import { supabase } from "@/lib/supabase/client";
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

export function rememberReferralCodeFromQuery(ref: string | null | undefined) {
  const code = (ref ?? "").trim().toUpperCase();
  if (code.length < 4) return;
  try {
    sessionStorage.setItem(PITCHRUSCH_PENDING_REFERRAL_KEY, code);
  } catch {
    /* ignore */
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
  const row = data as Record<string, unknown> | null;
  if (!row || row.ok !== true) {
    return { data: null, errorMessage: null };
  }
  const granted = row.granted_keys;
  const keys = Array.isArray(granted) ? granted.map((k) => String(k)) : [];
  return {
    data: {
      referralCode: typeof row.referral_code === "string" ? row.referral_code : null,
      inviteCount: typeof row.invite_count === "number" ? row.invite_count : Number(row.invite_count ?? 0),
      featuredPlayerUntil:
        typeof row.featured_player_until === "string" ? row.featured_player_until : null,
      grantedKeys: keys,
    },
    errorMessage: null,
  };
}

/**
 * Links the signed-in player to their referrer (once) and applies milestone rewards server-side.
 * Clears sessionStorage pending code on definitive success or unknown_code.
 */
export async function tryConsumePendingReferral(): Promise<void> {
  const code = peekPendingReferralCode();
  if (!code) return;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) return;

  const { data, error } = await supabase.rpc("goalnova_player_complete_referral", {
    p_referral_code: code,
  });

  if (error) {
    logFullSupabaseError("[referrals] goalnova_player_complete_referral", error, { code });
    return;
  }

  const row = data as Record<string, unknown> | null;
  const reason = typeof row?.reason === "string" ? row.reason : "";

  if (row?.ok === true) {
    if (reason === "no_player_profile" || reason === "not_player_role") {
      return;
    }
    clearPendingReferralCode();
    if (!row.noop) {
      dispatchPremiumUpdated();
    }
    return;
  }

  if (reason === "unknown_code" || reason === "invalid_code") {
    clearPendingReferralCode();
  }
}
