import { isApprovedScoutUser } from "@/lib/scoutVerification";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

/**
 * For each user id, whether they count as a trusted (verified) scout in the product.
 * Uses `get_scout_verification_flags` RPC — role + scout_verification_status, not role alone.
 */
export async function fetchVerifiedScoutFlagsForUserIds(
  userIds: string[],
): Promise<Map<string, boolean>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  const out = new Map<string, boolean>();
  if (unique.length === 0) return out;

  const { data, error } = await supabase.rpc("get_scout_verification_flags", {
    p_user_ids: unique,
  });

  if (error) {
    logFullSupabaseError(
      "[scoutVerificationPublic] fetchVerifiedScoutFlagsForUserIds",
      error,
      { count: unique.length },
    );
    for (const id of unique) out.set(id, false);
    return out;
  }

  for (const row of data ?? []) {
    out.set(
      row.id,
      isApprovedScoutUser({
        role: row.role,
        scout_verification_status: row.scout_verification_status,
      }),
    );
  }
  for (const id of unique) {
    if (!out.has(id)) out.set(id, false);
  }
  return out;
}
