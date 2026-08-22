import {
  hasCompletedPostAuthProfileLanding,
  markPostAuthProfileLandingComplete,
} from "@/lib/auth/postAuthLanding";
import { readAuthUserWithTimeout } from "@/lib/auth/readAuthUserWithTimeout";
import { isBootstrapAdminEmail } from "@/lib/admin/bootstrapAdminEmails";
import { supabase } from "@/lib/supabase/client";
import {
  peekPendingReferralCode,
  resolvePendingReferralCode,
} from "@/lib/supabase/referrals";
import { peekPendingSignupRole } from "@/lib/auth/pendingSignupRole";

/** Sync `/role` href — safe inside auth gates (never awaits hung `getUser`). */
export function roleOnboardingHrefSync(): string {
  const qs = new URLSearchParams();
  const pendingRole = peekPendingSignupRole();
  if (pendingRole === "player" || pendingRole === "scout") {
    qs.set("role", pendingRole);
  }
  const pendingRef = peekPendingReferralCode();
  if (pendingRef) qs.set("ref", pendingRef);
  const query = qs.toString();
  return query ? `/role?${query}` : "/role";
}

/** `/role` with pending referral query when available. */
export async function roleOnboardingHref(): Promise<string> {
  const qs = new URLSearchParams();
  const pendingRole = peekPendingSignupRole();
  if (pendingRole === "player" || pendingRole === "scout") {
    qs.set("role", pendingRole);
  }
  const pendingRef = await resolvePendingReferralCode();
  if (pendingRef) qs.set("ref", pendingRef);
  const query = qs.toString();
  return query ? `/role?${query}` : "/role";
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

  const [{ data: authData }, { data: userRow }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("users")
      .select("role, is_admin, admin_role")
      .eq("id", resolvedUserId)
      .maybeSingle(),
  ]);

  // Platform admin UI is only for the owner account — never for club contacts.
  if (isBootstrapAdminEmail(authData.user?.email)) return "/admin";
  if (userRow?.role === "club") return "/clubs";
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
