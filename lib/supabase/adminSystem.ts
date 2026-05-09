import {
  sanitizeAdminPlayerProfilePatch,
  sanitizeAdminScoutApplyPatch,
  sanitizeAdminScoutProfilePatch,
} from "@/lib/profileFieldSanitize";
import { supabase } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/database.types";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type AdminUserListRow =
  Database["public"]["Functions"]["goalnova_admin_list_users"]["Returns"][number];

export type SupportTicketRow =
  Database["public"]["Tables"]["support_tickets"]["Row"];
export type SupportTicketMessageRow =
  Database["public"]["Tables"]["support_ticket_messages"]["Row"];

export type ModerationReportRow =
  Database["public"]["Tables"]["moderation_reports"]["Row"];

export type AdminAuditRow =
  Database["public"]["Tables"]["admin_audit_log"]["Row"];

export type AdminUserDetail = {
  user: Record<string, unknown> | null;
  player_profile: Record<string, unknown> | null;
  player_profile_exists?: boolean;
  player_profile_source?: string | null;
  scout_profile: Record<string, unknown> | null;
};

export type AdminNoticeType =
  | "warning"
  | "guideline_violation"
  | "profile_issue"
  | "suspension_warning"
  | "verification_issue"
  | "custom";

export async function rpcAdminListUsers(opts: {
  limit?: number;
  offset?: number;
  search?: string | null;
}): Promise<{ rows: AdminUserListRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_admin_list_users", {
    p_limit: opts.limit ?? 50,
    p_offset: opts.offset ?? 0,
    p_search: opts.search ?? null,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_list_users", error);
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []) as AdminUserListRow[], error: null };
}

export async function rpcAdminGetUserDetail(
  userId: string,
): Promise<{ detail: AdminUserDetail | null; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_admin_get_user_detail", {
    p_user_id: userId,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_get_user_detail", error, {
      userId,
    });
    return { detail: null, error: error.message };
  }
  if (data == null) {
    return { detail: null, error: "Not found" };
  }
  const j = data as Record<string, unknown>;
  return {
    detail: {
      user: (j.user as Record<string, unknown>) ?? null,
      player_profile: (j.player_profile as Record<string, unknown>) ?? null,
      player_profile_exists:
        typeof j.player_profile_exists === "boolean"
          ? j.player_profile_exists
          : undefined,
      player_profile_source:
        typeof j.player_profile_source === "string"
          ? j.player_profile_source
          : null,
      scout_profile: (j.scout_profile as Record<string, unknown>) ?? null,
    },
    error: null,
  };
}

export async function rpcAdminSetSuspended(
  userId: string,
  suspended: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc("goalnova_admin_set_suspended", {
    p_user_id: userId,
    p_suspended: suspended,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_set_suspended", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminSetDeleted(
  userId: string,
  deleted: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_admin_set_deleted", {
    p_user_id: userId,
    p_deleted: deleted,
  });
  if (error) {
    const code = (error as { code?: string }).code ?? null;
    const msg = (error.message ?? "").toLowerCase();
    const rpcMissing =
      code === "PGRST202" ||
      msg.includes("goalnova_admin_set_deleted") ||
      msg.includes("function") ||
      msg.includes("does not exist");

    // Backward compatibility for deployments where RPC has not been applied yet.
    if (rpcMissing) {
      const fallback = await supabase
        .from("users")
        .update({ is_deleted: deleted })
        .eq("id", userId);
      if (!fallback.error) {
        console.warn(
          "[admin] goalnova_admin_set_deleted missing; used users.is_deleted fallback",
          { userId, deleted },
        );
        return { ok: true, error: null };
      }
      logFullSupabaseError("[admin] set_deleted fallback users.update failed", fallback.error, {
        userId,
        deleted,
      });
      return { ok: false, error: fallback.error.message };
    }

    logFullSupabaseError("[admin] goalnova_admin_set_deleted", error);
    return { ok: false, error: error.message };
  }
  console.log("ADMIN SOFT DELETE RESULT", {
    userId,
    p_deleted: deleted,
    payload: data ?? null,
  });
  return { ok: true, error: null };
}

export async function rpcAdminSendUserNotice(args: {
  userId: string;
  noticeType: AdminNoticeType;
  message: string;
  locale?: string | null;
}): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_admin_send_user_notice", {
    p_user_id: args.userId,
    p_notice_type: args.noticeType,
    p_message: args.message,
    p_locale: args.locale ?? null,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_send_user_notice", error, {
      userId: args.userId,
      noticeType: args.noticeType,
      messageLength: args.message.length,
      locale: args.locale ?? null,
    });
    return { ok: false, error: error.message };
  }
  console.log("ADMIN USER NOTICE SENT", {
    userId: args.userId,
    noticeType: args.noticeType,
    payload: data ?? null,
  });
  return { ok: true, error: null };
}

export async function rpcAdminSetPremium(
  userId: string,
  premium: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc("goalnova_admin_set_premium", {
    p_user_id: userId,
    p_premium: premium,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_set_premium", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminSetScoutVerificationStatus(
  userId: string,
  status: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc(
    "goalnova_admin_set_scout_verification_status",
    {
      p_user_id: userId,
      p_status: status,
    },
  );
  if (error) {
    logFullSupabaseError(
      "[admin] goalnova_admin_set_scout_verification_status",
      error,
    );
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminSetStaffRole(
  userId: string,
  role: string | null,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc("goalnova_admin_set_staff_role", {
    p_user_id: userId,
    p_admin_role: role,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_set_staff_role", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminSetAppRole(
  userId: string,
  role: "player" | "scout",
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc("goalnova_admin_set_app_role", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_set_app_role", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminMergePlayerProfile(
  userId: string,
  patch: Record<string, string | number | null>,
): Promise<{ ok: boolean; error: string | null }> {
  const safePatch = sanitizeAdminPlayerProfilePatch(patch);
  const { error } = await supabase.rpc("goalnova_admin_merge_player_profile", {
    p_user_id: userId,
    p_patch: safePatch as Json,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_merge_player_profile", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminMergeScoutProfile(
  userId: string,
  patch: Record<string, string | null>,
): Promise<{ ok: boolean; error: string | null }> {
  const safePatch = sanitizeAdminScoutProfilePatch(patch);
  const { error } = await supabase.rpc("goalnova_admin_merge_scout_profile", {
    p_user_id: userId,
    p_patch: safePatch as Json,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_merge_scout_profile", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminMergeScoutApplyFields(
  userId: string,
  patch: Record<string, string | null>,
): Promise<{ ok: boolean; error: string | null }> {
  const safePatch = sanitizeAdminScoutApplyPatch(patch);
  const { error } = await supabase.rpc(
    "goalnova_admin_merge_scout_apply_fields",
    {
      p_user_id: userId,
      p_patch: safePatch as Json,
    },
  );
  if (error) {
    logFullSupabaseError(
      "[admin] goalnova_admin_merge_scout_apply_fields",
      error,
    );
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminListSupportTickets(opts: {
  status?: string | null;
  assignedToMe?: boolean;
  limit?: number;
}): Promise<{ rows: SupportTicketRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc(
    "goalnova_admin_list_support_tickets",
    {
      p_status: opts.status ?? null,
      p_assigned_to_me: opts.assignedToMe ?? false,
      p_limit: opts.limit ?? 100,
    },
  );
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_list_support_tickets", error);
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []) as SupportTicketRow[], error: null };
}

export async function rpcAdminUpdateSupportTicket(args: {
  ticketId: string;
  status?: string | null;
  priority?: string | null;
  assignedAdminId?: string | null;
  internalNote?: string | null;
  clearAssignment?: boolean;
}): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc("goalnova_admin_update_support_ticket", {
    p_ticket_id: args.ticketId,
    p_status: args.status ?? null,
    p_priority: args.priority ?? null,
    p_assigned_admin_id: args.assignedAdminId ?? null,
    p_internal_note: args.internalNote ?? null,
    p_clear_assignment: args.clearAssignment ?? false,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_update_support_ticket", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminCreateTicketForUser(
  userId: string,
  subject: string,
  message: string,
  assignedAdminId?: string | null,
  category: string = "other",
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc(
    "goalnova_admin_create_support_ticket_for_user",
    {
      p_user_id: userId,
      p_subject: subject,
      p_message: message,
      p_assigned_admin_id: assignedAdminId ?? null,
      p_category: category,
    },
  );
  if (error) {
    logFullSupabaseError(
      "[admin] goalnova_admin_create_support_ticket_for_user",
      error,
    );
    return { id: null, error: error.message };
  }
  return { id: (data as string) ?? null, error: null };
}

export async function rpcAdminListSupportTicketMessages(
  ticketId: string,
): Promise<{ rows: SupportTicketMessageRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc(
    "goalnova_admin_list_support_ticket_messages",
    { p_ticket_id: ticketId },
  );
  if (error) {
    const code = (error as { code?: string }).code ?? null;
    // Migration/schema cache fallback: RPC may not exist yet.
    if (code === "PGRST202") {
      const fallback = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (fallback.error) {
        logFullSupabaseError(
          "[admin] support_ticket_messages fallback select failed",
          fallback.error,
          { ticketId },
        );
        return { rows: [], error: fallback.error.message };
      }
      console.warn(
        "[admin] goalnova_admin_list_support_ticket_messages missing; using table fallback",
        { ticketId },
      );
      return { rows: (fallback.data ?? []) as SupportTicketMessageRow[], error: null };
    }
    logFullSupabaseError("[admin] goalnova_admin_list_support_ticket_messages", error, {
      ticketId,
    });
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []) as SupportTicketMessageRow[], error: null };
}

export async function rpcAdminReplySupportTicket(args: {
  ticketId: string;
  message: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData.user?.id ?? null;
  if (!adminUserId) {
    return { ok: false, error: "Not authenticated" };
  }

  const trimmedMessage = args.message.trim();
  if (trimmedMessage.length < 2) {
    return { ok: false, error: "Invalid message" };
  }

  const { error } = await supabase.rpc("goalnova_admin_reply_support_ticket", {
    p_ticket_id: args.ticketId,
    p_message: trimmedMessage,
  });
  if (error) {
    const code = (error as { code?: string }).code ?? null;
    // Migration/schema cache fallback: RPC may not exist yet.
    if (code === "PGRST202") {
      const insertRes = await supabase.from("support_ticket_messages").insert({
        ticket_id: args.ticketId,
        sender_user_id: null,
        sender_admin_id: adminUserId,
        message: trimmedMessage,
        read_by_user_at: null,
        read_by_admin_at: new Date().toISOString(),
      });
      if (insertRes.error) {
        logFullSupabaseError(
          "[admin] support_ticket_messages fallback insert failed",
          insertRes.error,
          { ticketId: args.ticketId },
        );
        return { ok: false, error: insertRes.error.message };
      }

      const updateRes = await supabase
        .from("support_tickets")
        .update({
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", args.ticketId)
        .eq("status", "closed");
      if (updateRes.error) {
        logFullSupabaseError(
          "[admin] support_tickets fallback status update failed",
          updateRes.error,
          { ticketId: args.ticketId },
        );
      }

      console.warn(
        "[admin] goalnova_admin_reply_support_ticket missing; using table fallback",
        { ticketId: args.ticketId },
      );
      return { ok: true, error: null };
    }

    logFullSupabaseError("[admin] goalnova_admin_reply_support_ticket", error, {
      ticketId: args.ticketId,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminDeleteSupportTicketMessage(args: {
  messageId: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const rpc = supabase.rpc as unknown as (
    fn: string,
    params?: Record<string, unknown>,
  ) => Promise<{ error: { message?: string } | null }>;
  const { error } = await rpc("goalnova_admin_delete_support_ticket_message", {
    p_message_id: args.messageId,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_delete_support_ticket_message", error, {
      messageId: args.messageId,
    });
    return { ok: false, error: error.message ?? "Failed to delete support message" };
  }
  return { ok: true, error: null };
}

export async function markAdminSupportNotificationsReadForTicketOwner(
  ticketOwnerUserId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData.user?.id ?? null;
  if (!adminUserId) {
    return { ok: false, error: "Not authenticated" };
  }
  const ownerId = ticketOwnerUserId.trim();
  if (!ownerId) {
    return { ok: true, error: null };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", adminUserId)
    .eq("is_read", false)
    .eq("message", "New support ticket message from user")
    .eq("related_user_id", ownerId);

  if (error) {
    logFullSupabaseError("[admin] markAdminSupportNotificationsReadForTicketOwner", error, {
      ticketOwnerUserId: ownerId,
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function fetchAdminUnreadSupportCount(): Promise<{
  count: number;
  error: string | null;
}> {
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData.user?.id ?? null;
  if (!adminUserId) {
    return { count: 0, error: "Not authenticated" };
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", adminUserId)
    .eq("is_read", false)
    .or(
      [
        "message.eq.New support ticket message from user",
        "and(type.eq.scout_verification,message.eq.__gn:scout_admin_review_pending__)",
      ].join(","),
    );
  if (error) {
    logFullSupabaseError("[admin] fetchAdminUnreadSupportCount", error);
    return { count: 0, error: error.message };
  }
  return { count: count ?? 0, error: null };
}

export async function fetchAdminUnreadInboxBreakdown(): Promise<{
  supportCount: number;
  verificationCount: number;
  totalCount: number;
  error: string | null;
}> {
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData.user?.id ?? null;
  if (!adminUserId) {
    return {
      supportCount: 0,
      verificationCount: 0,
      totalCount: 0,
      error: "Not authenticated",
    };
  }

  const [supportRes, verificationRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", adminUserId)
      .eq("is_read", false)
      .eq("message", "New support ticket message from user"),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", adminUserId)
      .eq("is_read", false)
      .eq("type", "scout_verification")
      .eq("message", "__gn:scout_admin_review_pending__"),
  ]);

  const err = supportRes.error ?? verificationRes.error;
  if (err) {
    logFullSupabaseError("[admin] fetchAdminUnreadInboxBreakdown", err);
    return {
      supportCount: 0,
      verificationCount: 0,
      totalCount: 0,
      error: err.message,
    };
  }

  const supportCount = supportRes.count ?? 0;
  const verificationCount = verificationRes.count ?? 0;
  return {
    supportCount,
    verificationCount,
    totalCount: supportCount + verificationCount,
    error: null,
  };
}

export async function markAllAdminScoutVerificationNotificationsRead(): Promise<{
  ok: boolean;
  error: string | null;
}> {
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData.user?.id ?? null;
  if (!adminUserId) {
    return { ok: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", adminUserId)
    .eq("is_read", false)
    .eq("type", "scout_verification")
    .eq("message", "__gn:scout_admin_review_pending__");

  if (error) {
    logFullSupabaseError("[admin] markAllAdminScoutVerificationNotificationsRead", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function markAdminSupportMessagesRead(
  ticketId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from("support_ticket_messages")
    .update({ read_by_admin_at: new Date().toISOString() })
    .eq("ticket_id", ticketId)
    .not("sender_user_id", "is", null)
    .is("read_by_admin_at", null);
  if (error) {
    logFullSupabaseError("[admin] markAdminSupportMessagesRead", error, { ticketId });
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function markAllAdminSupportMessagesRead(): Promise<{
  ok: boolean;
  error: string | null;
}> {
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData.user?.id ?? null;
  if (!adminUserId) {
    return { ok: false, error: "Not authenticated" };
  }

  const nowIso = new Date().toISOString();
  const [messagesRes, notificationsRes] = await Promise.all([
    supabase
      .from("support_ticket_messages")
      .update({ read_by_admin_at: nowIso })
      .not("sender_user_id", "is", null)
      .is("read_by_admin_at", null),
    supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", adminUserId)
      .eq("is_read", false)
      .eq("message", "New support ticket message from user"),
  ]);

  const error = messagesRes.error ?? notificationsRes.error;
  if (error) {
    logFullSupabaseError("[admin] markAllAdminSupportMessagesRead", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminListModerationReports(opts: {
  status?: string;
  limit?: number;
}): Promise<{ rows: ModerationReportRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc(
    "goalnova_admin_list_moderation_reports",
    {
      p_status: opts.status ?? "open",
      p_limit: opts.limit ?? 100,
    },
  );
  if (error) {
    logFullSupabaseError(
      "[admin] goalnova_admin_list_moderation_reports",
      error,
    );
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []) as ModerationReportRow[], error: null };
}

export async function rpcAdminUpdateModerationReport(args: {
  reportId: string;
  status: string;
  assignedAdminId?: string | null;
  resolutionNote?: string | null;
}): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc(
    "goalnova_admin_update_moderation_report",
    {
      p_report_id: args.reportId,
      p_status: args.status,
      p_assigned_admin_id: args.assignedAdminId ?? null,
      p_resolution_note: args.resolutionNote ?? null,
    },
  );
  if (error) {
    logFullSupabaseError(
      "[admin] goalnova_admin_update_moderation_report",
      error,
    );
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function rpcAdminDeleteVideo(
  videoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_admin_delete_video", {
    p_video_id: videoId,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_delete_video", error);
    return { ok: false, error: error.message };
  }
  const body = data as { ok?: boolean; error?: string } | null;
  if (body && body.ok === false) {
    return { ok: false, error: body.error ?? "Failed" };
  }
  return { ok: true, error: null };
}

export async function rpcAdminDeleteComment(
  commentId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_admin_delete_comment", {
    p_comment_id: commentId,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_delete_comment", error);
    return { ok: false, error: error.message };
  }
  const body = data as { ok?: boolean; error?: string } | null;
  if (body && body.ok === false) {
    return { ok: false, error: body.error ?? "Failed" };
  }
  return { ok: true, error: null };
}

export async function rpcAdminListAuditLog(
  limit?: number,
): Promise<{ rows: AdminAuditRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_admin_list_audit_log", {
    p_limit: limit ?? 100,
  });
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_list_audit_log", error);
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []) as AdminAuditRow[], error: null };
}

export type StaffUserRow = {
  id: string;
  email: string | null;
  admin_role: string | null;
};

export type AdminInboxItemKind = "support_message" | "scout_verification";

export type AdminInboxItem = {
  id: string;
  kind: AdminInboxItemKind;
  label: string;
  createdAt: string | null;
  relatedUserId: string | null;
};

export async function rpcAdminListStaffUsers(): Promise<{
  rows: StaffUserRow[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_admin_list_staff_users");
  if (error) {
    logFullSupabaseError("[admin] goalnova_admin_list_staff_users", error);
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []) as StaffUserRow[], error: null };
}

export async function listAdminUnreadInboxItems(): Promise<{
  items: AdminInboxItem[];
  error: string | null;
}> {
  const { data: authData } = await supabase.auth.getUser();
  const adminUserId = authData.user?.id ?? null;
  if (!adminUserId) {
    return { items: [], error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, message, related_user_id, created_at")
    .eq("user_id", adminUserId)
    .eq("is_read", false)
    .or(
      [
        "message.eq.New support ticket message from user",
        "and(type.eq.scout_verification,message.eq.__gn:scout_admin_review_pending__)",
      ].join(","),
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logFullSupabaseError("[admin] listAdminUnreadInboxItems", error);
    return { items: [], error: error.message };
  }

  const items: AdminInboxItem[] = [];
  for (const row of data ?? []) {
    const type = typeof row.type === "string" ? row.type : "";
    const message = typeof row.message === "string" ? row.message : "";
    const relatedUserId =
      typeof row.related_user_id === "string" && row.related_user_id.trim().length > 0
        ? row.related_user_id
        : null;
    const createdAt = typeof row.created_at === "string" ? row.created_at : null;

    if (message === "New support ticket message from user") {
      items.push({
        id: row.id,
        kind: "support_message",
        label: "Support poruka",
        createdAt,
        relatedUserId,
      });
      continue;
    }
    if (type === "scout_verification" && message === "__gn:scout_admin_review_pending__") {
      items.push({
        id: row.id,
        kind: "scout_verification",
        label: "Scout verifikacija",
        createdAt,
        relatedUserId,
      });
    }
  }

  return { items, error: null };
}
