import { supabase } from "@/lib/supabase/client";
import { devWarn } from "@/lib/devLog";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type VideoUploadEligibility =
  | "loading"
  | "signed_out"
  | "player"
  | "non_player"
  | "unknown";

/**
 * Whether the current user may upload videos (player role, or player_profiles fallback).
 * Mirrors the gate in {@link UploadForm}.
 */
export async function resolveVideoUploadEligibility(): Promise<
  Exclude<VideoUploadEligibility, "loading">
> {
  /** Local session only — avoids `getUser()` → AuthSessionMissingError when unauthenticated. */
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();

  if (sessionErr) {
    logFullSupabaseError("[videoUploadEligibility] getSession", sessionErr);
    return "signed_out";
  }

  const user = sessionData.session?.user;
  if (!user?.id) {
    return "signed_out";
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (userError) {
    logFullSupabaseError("[videoUploadEligibility] users.role", userError, {
      userId: user.id,
    });
    const code = (userError as { code?: string | null })?.code ?? null;
    devWarn("[videoUploadEligibility] users select failed, trying player_profiles", {
      code,
    });

    const { data: playerProfile, error: ppErr } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (ppErr) {
      logFullSupabaseError(
        "[videoUploadEligibility] player_profiles fallback",
        ppErr,
      );
      return "unknown";
    }
    if (playerProfile?.id) {
      return "player";
    }
    return "unknown";
  }

  const r = userRow?.role;
  if (r === "player") {
    return "player";
  }
  if (r === "scout") {
    return "non_player";
  }
  return "non_player";
}
