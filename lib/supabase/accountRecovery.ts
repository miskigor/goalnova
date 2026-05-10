import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type AccountRecoveryRequestRow =
  Database["public"]["Tables"]["support_tickets"]["Row"];

export async function submitAccountRecoveryRequest(
  client: SupabaseClient<Database>,
  input: {
    accountEmail: string;
    contactEmail: string;
    username: string;
    message: string;
  },
): Promise<{ id: string | null; error: string | null }> {
  const primary = await client.rpc("pitchrusch_submit_account_recovery_ticket", {
    p_account_email: input.accountEmail.trim(),
    p_contact_email: input.contactEmail.trim(),
    p_username: input.username.trim() || null,
    p_message: input.message.trim(),
  });
  if (!primary.error && primary.data) {
    return { id: primary.data, error: null };
  }
  const fallback = await client.rpc("goalnova_submit_account_recovery_ticket", {
    p_account_email: input.accountEmail.trim(),
    p_contact_email: input.contactEmail.trim(),
    p_username: input.username.trim() || null,
    p_message: input.message.trim(),
  });
  if (fallback.error) {
    logFullSupabaseError("[account recovery] submit rpc", fallback.error);
    return { id: null, error: fallback.error.message };
  }
  return { id: fallback.data ?? null, error: null };
}

export async function adminListAccountRecoveryRequests(
  client: SupabaseClient<Database>,
  limit = 200,
): Promise<{ rows: AccountRecoveryRequestRow[]; error: string | null }> {
  const { data, error } = await client
    .from("support_tickets")
    .select("*")
    .eq("ticket_type", "account_recovery")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logFullSupabaseError("[admin] list account recovery", error);
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []) as AccountRecoveryRequestRow[], error: null };
}

export async function adminResolveAccountRecoveryRequest(
  client: SupabaseClient<Database>,
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await client
    .from("support_tickets")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("ticket_type", "account_recovery");
  if (error) {
    logFullSupabaseError("[admin] resolve account recovery", error);
    return { error: error.message };
  }
  return { error: null };
}
