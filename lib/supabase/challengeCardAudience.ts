import { isChallengeUploadSuperAdminBypassEnabled } from "@/lib/challenges/challengeUploadSuperAdminBypass";
import {
  isEffectiveSuperAdmin,
  isStaffUser,
} from "@/lib/supabase/adminScoutVerification";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type ChallengeCardAudience =
  | { kind: "guest" }
  /** Player, or signed-in user who may attempt upload (gate on upload page). */
  | { kind: "submitter" }
  | { kind: "scout" }
  | { kind: "staff"; isSuperAdmin: boolean };

/**
 * Role-specific challenge hub/detail actions: staff vs scout vs everyone else.
 */
export async function resolveChallengeCardAudience(): Promise<
  ChallengeCardAudience | null
> {
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();

  if (sessionErr) {
    logFullSupabaseError("[challengeCardAudience] getSession", sessionErr);
    return null;
  }

  const user = sessionData.session?.user;
  if (!user?.id) {
    return { kind: "guest" };
  }

  const { data: row, error: userErr } = await supabase
    .from("users")
    .select("role, is_admin, admin_role")
    .eq("id", user.id)
    .maybeSingle();

  if (userErr) {
    logFullSupabaseError("[challengeCardAudience] users select", userErr, {
      userId: user.id,
    });
    const { data: pp, error: ppErr } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (ppErr) {
      logFullSupabaseError(
        "[challengeCardAudience] player_profiles fallback",
        ppErr,
      );
      return null;
    }
    if (pp?.id) {
      return { kind: "submitter" };
    }
    return null;
  }

  if (row && isStaffUser(row)) {
    return {
      kind: "staff",
      isSuperAdmin: isEffectiveSuperAdmin(row),
    };
  }

  const role = String(row?.role ?? "").trim();
  if (role === "scout") {
    return { kind: "scout" };
  }

  return { kind: "submitter" };
}

export function shouldOfferStaffTestUpload(audience: ChallengeCardAudience): boolean {
  return (
    audience.kind === "staff" &&
    audience.isSuperAdmin &&
    isChallengeUploadSuperAdminBypassEnabled()
  );
}
