import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type SupportTicketRow = Database["public"]["Tables"]["support_tickets"]["Row"];
export type SupportTicketMessageRow =
  Database["public"]["Tables"]["support_ticket_messages"]["Row"];

export type SupportTicketCategory =
  | "account_issue"
  | "verification_issue"
  | "payment_issue"
  | "report_problem"
  | "bug_report"
  | "other";

export async function createSupportTicket(args: {
  subject: string;
  message: string;
  category: SupportTicketCategory;
}): Promise<{ id: string | null; error: string | null }> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  const primary = await rpc("pitchrusch_create_support_ticket", {
    p_subject: args.subject,
    p_message: args.message,
    p_category: args.category,
  });
  const { data, error } =
    primary.error?.code === "PGRST202"
      ? await rpc("goalnova_create_support_ticket", {
          p_subject: args.subject,
          p_message: args.message,
          p_category: args.category,
        })
      : primary;
  if (error) {
    logFullSupabaseError("[support] create_support_ticket rpc", error);
    return { id: null, error: error.message ?? null };
  }
  return { id: (data as string) ?? null, error: null };
}

export async function listMySupportTickets(): Promise<{
  rows: SupportTicketRow[];
  error: string | null;
}> {
  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  if (!uid) {
    return { rows: [], error: "Not authenticated" };
  }
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) {
    logFullSupabaseError("[support] listMySupportTickets", error);
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []) as SupportTicketRow[], error: null };
}

export async function listMySupportTicketMessages(ticketId: string): Promise<{
  rows: SupportTicketMessageRow[];
  error: string | null;
}> {
  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  if (!uid) {
    return { rows: [], error: "Not authenticated" };
  }
  const ownership = await supabase
    .from("support_tickets")
    .select("id")
    .eq("id", ticketId)
    .eq("user_id", uid)
    .maybeSingle();
  if (ownership.error) {
    logFullSupabaseError("[support] listMySupportTicketMessages ownership check", ownership.error, {
      ticketId,
    });
    return { rows: [], error: ownership.error.message };
  }
  if (!ownership.data) {
    return { rows: [], error: "Forbidden" };
  }

  const { data, error } = await supabase
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) {
    logFullSupabaseError("[support] listMySupportTicketMessages", error, { ticketId });
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []) as SupportTicketMessageRow[], error: null };
}

export async function listMyUnreadSupportReplyTicketIds(): Promise<{
  ids: string[];
  error: string | null;
}> {
  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  if (!uid) {
    return { ids: [], error: "Not authenticated" };
  }
  const ownedTickets = await supabase
    .from("support_tickets")
    .select("id")
    .eq("user_id", uid);
  if (ownedTickets.error) {
    logFullSupabaseError("[support] listMyUnreadSupportReplyTicketIds ownership scope", ownedTickets.error);
    return { ids: [], error: ownedTickets.error.message };
  }
  const ticketIds = (ownedTickets.data ?? []).map((r) => String(r.id));
  if (ticketIds.length === 0) {
    return { ids: [], error: null };
  }

  const { data, error } = await supabase
    .from("support_ticket_messages")
    .select("ticket_id")
    .in("ticket_id", ticketIds)
    .not("sender_admin_id", "is", null)
    .is("read_by_user_at", null);
  if (error) {
    logFullSupabaseError("[support] listMyUnreadSupportReplyTicketIds", error);
    return { ids: [], error: error.message };
  }
  const ids = [...new Set((data ?? []).map((r) => String(r.ticket_id)))];
  return { ids, error: null };
}

export async function countMyUnreadSupportReplies(): Promise<{
  count: number;
  error: string | null;
}> {
  const res = await listMyUnreadSupportReplyTicketIds();
  if (res.error) {
    return { count: 0, error: res.error };
  }
  return { count: res.ids.length, error: null };
}

export async function markMySupportTicketRepliesRead(
  ticketId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  if (!uid) {
    return { ok: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("support_ticket_messages")
    .update({ read_by_user_at: new Date().toISOString() })
    .eq("ticket_id", ticketId)
    .not("sender_admin_id", "is", null)
    .is("read_by_user_at", null);
  if (error) {
    logFullSupabaseError("[support] markMySupportTicketRepliesRead", error, { ticketId });
    return { ok: false, error: error.message };
  }

  const notifRes = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", uid)
    .eq("is_read", false)
    .eq("message", "PitchRusch Support replied to your ticket");
  if (notifRes.error) {
    logFullSupabaseError("[support] markMySupportTicketRepliesRead notifications", notifRes.error, {
      ticketId,
    });
    return { ok: false, error: notifRes.error.message };
  }

  return { ok: true, error: null };
}

export async function sendMySupportTicketMessage(args: {
  ticketId: string;
  message: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const body = args.message.trim();
  if (body.length < 2) {
    return { ok: false, error: "Invalid message" };
  }
  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  if (!uid) {
    return { ok: false, error: "Not authenticated" };
  }
  const ownership = await supabase
    .from("support_tickets")
    .select("id")
    .eq("id", args.ticketId)
    .eq("user_id", uid)
    .maybeSingle();
  if (ownership.error) {
    logFullSupabaseError("[support] sendMySupportTicketMessage ownership check", ownership.error, {
      ticketId: args.ticketId,
    });
    return { ok: false, error: ownership.error.message };
  }
  if (!ownership.data) {
    return { ok: false, error: "You can only reply to your own support ticket." };
  }

  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params?: Record<string, unknown>,
  ) => Promise<{ error: { message?: string; code?: string } | null }>;
  const primaryRpcRes = await rpc("pitchrusch_user_reply_support_ticket", {
    p_ticket_id: args.ticketId,
    p_message: body,
  });
  const rpcRes =
    primaryRpcRes.error?.code === "PGRST202"
      ? await rpc("goalnova_user_reply_support_ticket", {
          p_ticket_id: args.ticketId,
          p_message: body,
        })
      : primaryRpcRes;

  if (!rpcRes.error) {
    return { ok: true, error: null };
  }

  const code = rpcRes.error?.code ?? null;
  // Fallback for environments where RPC migration is not yet applied.
  if (code === "PGRST202") {
    const fallback = await supabase.from("support_ticket_messages").insert({
      ticket_id: args.ticketId,
      sender_user_id: uid,
      sender_admin_id: null,
      message: body,
      read_by_user_at: new Date().toISOString(),
      read_by_admin_at: null,
    });
    if (fallback.error) {
      logFullSupabaseError("[support] sendMySupportTicketMessage fallback insert", fallback.error, {
        ticketId: args.ticketId,
      });
      return { ok: false, error: fallback.error.message };
    }
    return { ok: true, error: null };
  }

  logFullSupabaseError("[support] user_reply_support_ticket rpc", rpcRes.error, {
    ticketId: args.ticketId,
  });
  return { ok: false, error: rpcRes.error.message ?? "Failed to send support message" };
}
