import { isRoleOnboardingExempt } from "@/lib/onboarding/roleOnboarding";
import { supabase } from "@/lib/supabase/client";
import { resolvePendingReferralCode } from "@/lib/supabase/referrals";

/** `/role` with pending referral query when available. */
export async function roleOnboardingHref(): Promise<string> {
  const pendingRef = await resolvePendingReferralCode();
  return pendingRef ? `/role?ref=${encodeURIComponent(pendingRef)}` : "/role";
}

/** Where to send users who already finished role onboarding. */
export async function resolvePostOnboardingHomePath(): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return "/home";

  const { data: userRow } = await supabase
    .from("users")
    .select("role, is_admin, admin_role")
    .eq("id", userId)
    .maybeSingle();

  if (isRoleOnboardingExempt(userRow)) return "/admin";
  if (userRow?.role === "scout") return "/scout-dashboard";
  if (userRow?.role === "player") return "/profile";
  return "/home";
}
