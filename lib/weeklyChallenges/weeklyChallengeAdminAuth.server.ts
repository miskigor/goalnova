import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isBootstrapAdminEmail } from "@/lib/admin/bootstrapAdminEmails";
import type { Database } from "@/lib/supabase/database.types";

function isStaffRow(row: {
  is_admin?: boolean | null;
  admin_role?: string | null;
} | null): boolean {
  if (!row) return false;
  const ar = row.admin_role?.trim();
  if (ar === "super_admin" || ar === "support_admin" || ar === "moderator") {
    return true;
  }
  return !!row.is_admin;
}

/** Matches `goalnova_weekly_challenge_admin()` RLS gate. */
export async function isWeeklyChallengeAdminServer(
  client: SupabaseClient<Database>,
  userId: string,
  email: string | null | undefined,
): Promise<boolean> {
  if (isBootstrapAdminEmail(email)) return true;

  const { data, error } = await client
    .from("users")
    .select("is_admin, admin_role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return isStaffRow(data);
}
