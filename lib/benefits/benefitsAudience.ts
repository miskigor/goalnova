import {
  isAppRole,
  isRoleOnboardingExempt,
} from "@/lib/onboarding/roleOnboarding";
import { supabase } from "@/lib/supabase/client";

export type BenefitsAudience =
  | "player"
  | "scout"
  | "admin"
  | "needs_role"
  | "player_setup_incomplete";

export type BenefitsAudienceSnapshot = {
  audience: BenefitsAudience;
  userId: string | null;
  role: string | null;
  hasPlayerProfile: boolean;
  referralCode: string | null;
};

export async function resolveBenefitsAudience(): Promise<BenefitsAudienceSnapshot> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? null;
  if (!uid) {
    return {
      audience: "scout",
      userId: null,
      role: null,
      hasPlayerProfile: false,
      referralCode: null,
    };
  }

  const [{ data: userRow }, { data: playerProfile }] = await Promise.all([
    supabase.from("users").select("role, is_admin, admin_role").eq("id", uid).maybeSingle(),
    supabase
      .from("player_profiles")
      .select("id, referral_code")
      .eq("id", uid)
      .maybeSingle(),
  ]);

  const role = userRow?.role ?? null;
  const hasPlayerProfile = Boolean(playerProfile?.id);
  const referralCode =
    typeof playerProfile?.referral_code === "string"
      ? playerProfile.referral_code.trim() || null
      : null;

  const base = { userId: uid, role, hasPlayerProfile, referralCode };

  if (isRoleOnboardingExempt(userRow)) {
    return { ...base, audience: "admin" };
  }

  if (!isAppRole(role)) {
    return { ...base, audience: "needs_role" };
  }

  if (role === "scout") {
    return { ...base, audience: "scout" };
  }

  if (!hasPlayerProfile) {
    return { ...base, audience: "player_setup_incomplete" };
  }

  return { ...base, audience: "player" };
}
