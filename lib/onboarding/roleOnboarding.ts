import { supabase } from "@/lib/supabase/client";

export type AppRole = "player" | "scout";

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

  const role = userRow?.role ?? null;
  if (!isAppRole(role)) {
    return true;
  }

  if (role === "scout") {
    const { data: scoutProfile } = await supabase
      .from("scout_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    return !isScoutOnboardingComplete(role, scoutProfile?.id);
  }

  const { data: playerProfile } = await supabase
    .from("player_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  return !isPlayerOnboardingComplete(role, playerProfile?.id);
}
