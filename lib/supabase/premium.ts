import { supabase } from "./client";
import { hasPermanentPremiumAccess } from "@/lib/admin/bootstrapAdminEmails";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "./logError";
import { isSubscriptionActive, isClubPlan, isPlayerPremium, isScoutPro } from "@/lib/subscription/access";

/** Dispatched after premium changes so headers, profile, and AI gates refetch premium. */
export const PITCHRUSCH_PREMIUM_UPDATED_EVENT = "pitchrusch-premium-updated" as const;

/**
 * Premium gating (v1): `public.users.is_premium` must be explicitly `true`.
 * Missing row, `false`, `null`, unknown column, RLS denial, or network failure → non-premium (locked UI).
 * Never throws; callers can safely omit `.catch` on the returned promise.
 */
export async function fetchUserIsPremium(
  userId: string,
): Promise<{ isPremium: boolean; errorMessage: string | null }> {
  try {
    const roleLookup = await supabase
      .from("users")
      .select("role,email")
      .eq("id", userId)
      .maybeSingle();
    const userRole = String(roleLookup.data?.role ?? "").trim();
    const userEmail = roleLookup.data?.email ?? null;

    if (hasPermanentPremiumAccess(userEmail)) {
      return { isPremium: true, errorMessage: null };
    }

    const primary = await supabase
      .from("users")
      .select("is_premium,subscription_plan,subscription_status,subscription_current_period_end")
      .eq("id", userId)
      .maybeSingle();

    let data = primary.data;
    let error = primary.error;

    // Backward compatibility for databases where Stripe subscription columns
    // are not migrated yet: gracefully fall back to legacy `is_premium`.
    if (error && isMissingSubscriptionColumnsError(error)) {
      const fallback = await supabase
        .from("users")
        .select("is_premium")
        .eq("id", userId)
        .maybeSingle();
      data = fallback.data as typeof data;
      error = fallback.error;
    }

    if (error) {
      logFullSupabaseError("[premium] fetchUserIsPremium", error, {
        userId,
        missingIsPremiumColumn: isMissingIsPremiumColumnError(error),
        missingSubscriptionColumns: isMissingSubscriptionColumnsError(error),
      });

      return {
        isPremium: false,
        errorMessage: supabaseErrorToUserMessage(error),
      };
    }

    // No row in users fallback check via profile tables.
    if (data == null) {
      const profileFallback = await fetchPremiumFromProfileTable(userId, userRole);
      if (profileFallback.errorMessage) {
        return { isPremium: false, errorMessage: profileFallback.errorMessage };
      }
      return { isPremium: profileFallback.isPremium, errorMessage: null };
    }

    // Stripe subscriptions are the source of truth; keep `is_premium` only for legacy rows.
    const isPremiumFromSubscription =
      isSubscriptionActive(data) && (isPlayerPremium(data) || isScoutPro(data) || isClubPlan(data));
    const hasManagedSubscription = Boolean(
      String(data.subscription_plan ?? "").trim() &&
        String(data.subscription_status ?? "").trim(),
    );
    let isPremium = isPremiumFromSubscription;
    if (!isPremium && !hasManagedSubscription && data.is_premium === true) {
      isPremium = true;
    }

    // If users row still shows free (race/migration mismatch), trust role profile table.
    if (!isPremium) {
      const profileFallback = await fetchPremiumFromProfileTable(userId, userRole);
      if (!profileFallback.errorMessage) {
        isPremium = profileFallback.isPremium;
      }
    }

    return { isPremium, errorMessage: null };
  } catch (err) {
    logFullSupabaseError("[premium] fetchUserIsPremium (unexpected)", err, {
      userId,
    });
    return {
      isPremium: false,
      errorMessage:
        err instanceof Error ? err.message : supabaseErrorToUserMessage(err),
    };
  }
}

async function fetchPremiumFromProfileTable(
  userId: string,
  role: string,
): Promise<{ isPremium: boolean; errorMessage: string | null }> {
  if (role !== "player" && role !== "scout") {
    return { isPremium: false, errorMessage: null };
  }
  const table = role === "player" ? "player_profiles" : "scout_profiles";
  const { data, error } = await supabase
    .from(table)
    .select("subscription_plan,subscription_status,subscription_current_period_end")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logFullSupabaseError("[premium] fetchPremiumFromProfileTable", error, {
      userId,
      table,
    });
    return { isPremium: false, errorMessage: supabaseErrorToUserMessage(error) };
  }
  if (!data) return { isPremium: false, errorMessage: null };

  const active =
    isSubscriptionActive(data) && (isPlayerPremium(data) || isScoutPro(data) || isClubPlan(data));
  return { isPremium: active, errorMessage: null };
}

/** PostgREST / Postgres signals that `is_premium` is not in the schema or not allowed in SELECT. */
function isMissingIsPremiumColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const o = err as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  const msg = `${o.message ?? ""} ${o.details ?? ""} ${o.hint ?? ""}`;
  const code = o.code ?? "";

  if (code === "42703") return true;
  if (/PGRST204/i.test(msg)) return true;
  if (/is_premium/i.test(msg) && /does not exist|not exist|unknown column/i.test(msg))
    return true;
  if (/column .*\.is_premium/i.test(msg) && /does not exist/i.test(msg))
    return true;

  return false;
}

function isMissingSubscriptionColumnsError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const o = err as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  const msg = `${o.message ?? ""} ${o.details ?? ""} ${o.hint ?? ""}`.toLowerCase();
  if (o.code === "42703") {
    return msg.includes("subscription_plan") || msg.includes("subscription_status");
  }
  if (/pgrst204/i.test(msg)) {
    return msg.includes("subscription_plan") || msg.includes("subscription_status");
  }
  return false;
}

/**
 * @deprecated Self-serve premium grants are disabled. Use `/premium` (Stripe checkout) or admin grant.
 */
export async function mockUpgradeToPremium(
  userId: string,
): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  void userId;
  return {
    ok: false,
    errorMessage:
      "Self-serve premium activation is disabled. Subscribe on the Premium page or contact support.",
  };
}
