import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isBootstrapAdminEmail } from "@/lib/admin/bootstrapAdminEmails";

/** super_admin only (includes legacy `is_admin` with no admin_role). */
export async function isSuperAdminClient(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("users")
    .select("admin_role, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;
  if (data.admin_role === "super_admin") return true;
  if (data.is_admin && (data.admin_role == null || data.admin_role === "")) return true;
  return false;
}

/** super_admin, moderator, or legacy `is_admin` — not support_admin. */
export async function canModerateVideosClient(
  client: SupabaseClient<Database>,
  userId: string,
  email?: string | null,
): Promise<boolean> {
  if (isBootstrapAdminEmail(email)) return true;

  const { data, error } = await client
    .from("users")
    .select("admin_role, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;

  const role = data.admin_role?.trim();
  if (role === "super_admin" || role === "moderator") return true;
  if (data.is_admin && (data.admin_role == null || data.admin_role === "")) return true;
  return false;
}
