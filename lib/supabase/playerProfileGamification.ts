import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type PlayerProfileGamification = {
  total_xp: number;
  freestyle_badge: boolean;
};

function parseGamificationPayload(raw: unknown): PlayerProfileGamification | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const totalXp = typeof o.total_xp === "number" ? o.total_xp : Number(o.total_xp);
  if (!Number.isFinite(totalXp) || totalXp < 0) return null;
  return {
    total_xp: Math.floor(totalXp),
    freestyle_badge: o.freestyle_badge === true,
  };
}

export async function fetchPlayerProfileGamification(
  userId: string,
): Promise<PlayerProfileGamification | null> {
  const id = userId.trim();
  if (!id) return null;

  const { data, error } = await supabase.rpc("goalnova_public_player_profile_gamification", {
    p_user_id: id,
  });

  if (error) {
    logFullSupabaseError("[playerProfileGamification] RPC", error, { userId: id });
    return null;
  }

  return parseGamificationPayload(data);
}
