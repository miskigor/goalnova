import {
  hasCompletedPostAuthProfileLanding,
  markPostAuthProfileLandingComplete,
} from "@/lib/auth/postAuthLanding";
import { isRoleOnboardingExempt } from "@/lib/onboarding/roleOnboarding";
import { supabase } from "@/lib/supabase/client";
import { resolvePendingReferralCode } from "@/lib/supabase/referrals";

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
    const { data: auth } = await supabase.auth.getUser();
    resolvedUserId = auth.user?.id ?? null;
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
