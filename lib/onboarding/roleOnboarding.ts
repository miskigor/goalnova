import { readAuthUserWithTimeout } from "@/lib/auth/readAuthUserWithTimeout";
import { isStaffUser } from "@/lib/supabase/adminScoutVerification";
import { supabase } from "@/lib/supabase/client";

export type AppRole = "player" | "scout";

type UsersOnboardingRow = {
  role: string | null;
  is_admin?: boolean | null;
  admin_role?: string | null;
};

/** Legacy app role or staff flags — never sent through Player/Scout /role onboarding. */
export function isRoleOnboardingExempt(row: UsersOnboardingRow | null | undefined): boolean {
  if (!row) return false;
  if (row.role === "admin") return true;
  return isStaffUser(row);
}

export function isAppRole(value: string | null | undefined): value is AppRole {
  return value === "player" || value === "scout";
}

/**
 * Player onboarding is complete only when role is player and a profile row exists.
 */
export function isPlayerOnboardingComplete(
  role: string | null | undefined,
  playerProfileId: string | null | undefined,
): boolean {
  return role === "player" && Boolean(playerProfileId);
}

/**
 * Scout onboarding is complete only when role is scout and a profile row exists.
 */
export function isScoutOnboardingComplete(
  role: string | null | undefined,
  scoutProfileId: string | null | undefined,
): boolean {
  return role === "scout" && Boolean(scoutProfileId);
}

/**
 * True when the signed-in user still needs to finish /role.
 * Pass `userId` after sign-in to skip an extra `getUser()` round trip.
 */
export async function needsRoleOnboardingPage(
  userId?: string | null,
): Promise<boolean> {
  let resolvedUserId = userId?.trim() || null;
  if (!resolvedUserId) {
    resolvedUserId =
      (await readAuthUserWithTimeout("needsRoleOnboardingPage"))?.id ?? null;
  }
  if (!resolvedUserId) return false;

  const { data: userRow } = await supabase
    .from("users")
    .select("role, is_admin, admin_role")
    .eq("id", resolvedUserId)
    .maybeSingle();

  if (isRoleOnboardingExempt(userRow)) {
    return false;
  }

  const role = userRow?.role ?? null;
  if (!isAppRole(role)) {
    return true;
  }

  if (role === "scout") {
    const { data: scoutProfile } = await supabase
      .from("scout_profiles")
      .select("id")
      .eq("id", resolvedUserId)
      .maybeSingle();
    return !isScoutOnboardingComplete(role, scoutProfile?.id);
  }

  const { data: playerProfile } = await supabase
    .from("player_profiles")
    .select("id")
    .eq("id", resolvedUserId)
    .maybeSingle();

  return !isPlayerOnboardingComplete(role, playerProfile?.id);
}
