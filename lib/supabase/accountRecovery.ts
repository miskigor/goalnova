import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";

export type AccountRecoveryRequestRow =
  Database["public"]["Tables"]["support_tickets"]["Row"];

const ACCOUNT_RECOVERY_SUBJECT = "Account recovery request";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** PostgREST returns UUID RPC results as strings; reject odd shapes so we never leak non-strings into UI state. */
function rpcTicketId(data: unknown): string | null {
  if (typeof data === "string" && data.trim().length > 0) {
    return data.trim();
  }
  return null;
}

type ApiOutcome =
  | { kind: "success"; id: string }
  | { kind: "failure"; error: string }
  | { kind: "skip" };

/**
 * Same-origin API route uses service role (bypasses missing anon RPC / RLS).
 * Returns skip when service role is not configured (503) or fetch failed — caller falls back to anon Supabase.
 */
async function submitViaServiceRoleApi(input: {
  accountEmail: string;
  contactEmail: string;
  username: string | null;
  message: string;
}): Promise<ApiOutcome> {
  try {
    const res = await fetch("/api/support/account-recovery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        accountEmail: input.accountEmail,
        contactEmail: input.contactEmail,
        username: input.username ?? "",
        message: input.message,
      }),
    });

    let json: {
      ok?: boolean;
      id?: string;
      error?: string;
      reason?: string;
    } = {};

    try {
      json = (await res.json()) as typeof json;
    } catch {
      return res.status === 503 ? { kind: "skip" } : { kind: "failure", error: "Request failed. Please try again." };
    }

    if (res.status === 503 && json.reason === "service_role_unconfigured") {
      return { kind: "skip" };
    }

    if (res.ok && typeof json.id === "string" && json.id.length > 0) {
      return { kind: "success", id: json.id };
    }

    const err =
      typeof json.error === "string" && json.error.trim().length > 0
        ? json.error.trim()
        : `Request failed (${res.status}).`;
    return { kind: "failure", error: err };
  } catch {
    return { kind: "skip" };
  }
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

    const apiFirst = await submitViaServiceRoleApi({
      accountEmail,
      contactEmail,
      username,
      message,
    });
    if (apiFirst.kind === "success") {
      return { id: apiFirst.id, error: null };
    }
    if (apiFirst.kind === "failure") {
      return { id: null, error: apiFirst.error };
    }

    const rpcArgs = {
      p_account_email: accountEmail,
      p_contact_email: contactEmail,
      p_message: message,
      p_username: username,
    };

    // Prefer RPC first: SECURITY DEFINER insert works even if anon INSERT RLS is missing;
    // direct insert is faster when both RPC and policy exist (second path).
    const primary = await client.rpc("pitchrusch_submit_account_recovery_ticket", rpcArgs);
    const primaryId = rpcTicketId(primary.data);
    if (!primary.error && primaryId) {
      return { id: primaryId, error: null };
    }
    if (primary.error) {
      logFullSupabaseError(
        "[account recovery] rpc pitchrusch_submit_account_recovery_ticket",
        primary.error,
      );
    }

    const fallbackRpc = await client.rpc("goalnova_submit_account_recovery_ticket", rpcArgs);
    const fallbackId = rpcTicketId(fallbackRpc.data);
    if (!fallbackRpc.error && fallbackId) {
      return { id: fallbackId, error: null };
    }
    if (fallbackRpc.error) {
      logFullSupabaseError(
        "[account recovery] rpc goalnova_submit_account_recovery_ticket",
        fallbackRpc.error,
      );
    }

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

    const combined = mergeAccountRecoveryErrors(
      primary.error,
      fallbackRpc.error,
      inserted.error,
    );
    return {
      id: null,
      error:
        combined ||
        String(fallbackRpc.error?.message ?? inserted.error?.message ?? "Request failed."),
    };
  } catch (e) {
    logFullSupabaseError("[account recovery] submitAccountRecoveryRequest threw", e);
    return {
      id: null,
      error: supabaseErrorToUserMessage(e),
    };
  }
}

function stringOrEmpty(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

function mergeAccountRecoveryErrors(
  primary: { message?: unknown } | null | undefined,
  fallback: { message?: unknown } | null | undefined,
  insert: { message?: unknown } | null | undefined,
): string {
  const parts = [
    stringOrEmpty(primary?.message).trim(),
    stringOrEmpty(fallback?.message).trim(),
    stringOrEmpty(insert?.message).trim(),
  ].filter((s) => s.length > 0);
  return parts.join(" — ");
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
