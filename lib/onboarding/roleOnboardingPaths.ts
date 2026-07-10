import {
  hasCompletedPostAuthProfileLanding,
  markPostAuthProfileLandingComplete,
} from "@/lib/auth/postAuthLanding";
import { readAuthUserWithTimeout } from "@/lib/auth/readAuthUserWithTimeout";
import { isRoleOnboardingExempt } from "@/lib/onboarding/roleOnboarding";
import { supabase } from "@/lib/supabase/client";
import {
  peekPendingReferralCode,
  resolvePendingReferralCode,
} from "@/lib/supabase/referrals";

/** Sync `/role` href — safe inside auth gates (never awaits hung `getUser`). */
export function roleOnboardingHrefSync(): string {
  const pendingRef = peekPendingReferralCode();
  return pendingRef ? `/role?ref=${encodeURIComponent(pendingRef)}` : "/role";
}

/** `/role` with pending referral query when available. */
export async function roleOnboardingHref(): Promise<string> {
  const pendingRef = await resolvePendingReferralCode();
  return pendingRef ? `/role?ref=${encodeURIComponent(pendingRef)}` : "/role";
}

/** Where to send users who already finished role onboarding. */
export async function resolvePostOnboardingHomePath(
  userId?: string | null,
): Promise<string> {
  let resolvedUserId = userId?.trim() || null;
  if (!resolvedUserId) {
    resolvedUserId =
      (await readAuthUserWithTimeout("resolvePostOnboardingHomePath"))?.id ?? null;
  }
  if (!resolvedUserId) return "/home";

  const { data: userRow } = await supabase
    .from("users")
    .select("role, is_admin, admin_role")
    .eq("id", resolvedUserId)
    .maybeSingle();

  if (isRoleOnboardingExempt(userRow)) return "/admin";
  if (userRow?.role === "scout") return "/scout-dashboard";
  if (userRow?.role === "player") {
    if (!hasCompletedPostAuthProfileLanding(resolvedUserId)) {
      markPostAuthProfileLandingComplete(resolvedUserId);
      return "/profile";
    }
    return "/home";
  }
  return "/home";
}
