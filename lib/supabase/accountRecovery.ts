import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";

export type AccountRecoveryRequestRow =
  Database["public"]["Tables"]["support_tickets"]["Row"];

const ACCOUNT_RECOVERY_SUBJECT = "Account recovery request";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function submitAccountRecoveryRequest(
  client: SupabaseClient<Database>,
  input: {
    accountEmail: string;
    contactEmail: string;
    username: string;
    message: string;
  },
): Promise<{ id: string | null; error: string | null }> {
  try {
    const accountEmail = normalizeEmail(input.accountEmail);
    const contactEmail = normalizeEmail(input.contactEmail);
    const message = input.message.trim();
    const username = input.username.trim() ? input.username.trim() : null;

    const row: Database["public"]["Tables"]["support_tickets"]["Insert"] = {
      user_id: null,
      subject: ACCOUNT_RECOVERY_SUBJECT,
      message,
      category: "account_issue",
      ticket_type: "account_recovery",
      account_email: accountEmail,
      contact_email: contactEmail,
      username,
      status: "open",
      priority: "normal",
    };

    const inserted = await client.from("support_tickets").insert(row).select("id");
    const insertedId = inserted.data?.[0]?.id;

    if (!inserted.error && insertedId) {
      return { id: insertedId, error: null };
    }

    if (inserted.error) {
      logFullSupabaseError("[account recovery] insert support_tickets", inserted.error);
    }

    const rpcArgs = {
      p_account_email: accountEmail,
      p_contact_email: contactEmail,
      p_username: username,
      p_message: message,
    };

    const primary = await client.rpc("pitchrusch_submit_account_recovery_ticket", rpcArgs);
    if (!primary.error && primary.data) {
      return { id: primary.data, error: null };
    }
    if (primary.error) {
      logFullSupabaseError(
        "[account recovery] rpc pitchrusch_submit_account_recovery_ticket",
        primary.error,
      );
    }

    const fallback = await client.rpc("goalnova_submit_account_recovery_ticket", rpcArgs);
    if (fallback.error) {
      logFullSupabaseError(
        "[account recovery] rpc goalnova_submit_account_recovery_ticket",
        fallback.error,
      );
      const combined = [
        inserted.error?.message,
        primary.error?.message,
        fallback.error?.message,
      ]
        .map((s) => (s == null ? "" : String(s).trim()))
        .filter((s) => s.length > 0)
        .join(" — ");
      return { id: null, error: combined || String(fallback.error.message ?? "Request failed.") };
    }
    return { id: fallback.data ?? null, error: null };
  } catch (e) {
    logFullSupabaseError("[account recovery] submitAccountRecoveryRequest threw", e);
    return {
      id: null,
      error: supabaseErrorToUserMessage(e),
    };
  }
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
  const { data, error } = await client
    .from("support_tickets")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("ticket_type", "account_recovery")
    .select("id")
    .maybeSingle();
  if (error) {
    logFullSupabaseError("[admin] resolve account recovery", error);
    return { error: error.message };
  }
  if (!data?.id) {
    return { error: "Ticket not found or already updated." };
  }
  return { error: null };
}
