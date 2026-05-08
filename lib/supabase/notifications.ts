import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { supabase } from "@/lib/supabase/client";
import {
  extractPostgrestErrorFields,
  isLikelyTransientNetworkFailure,
  logFullSupabaseError,
  type PostgrestErrorFields,
} from "@/lib/supabase/logError";

export type { PostgrestErrorFields };

export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "message"
  | "ai_analysis"
  | "welcome"
  | "onboarding"
  | "profile"
  | "upload"
  | "scout_verification"
  | "challenge";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

type NotificationsInsert = Database["public"]["Tables"]["notifications"]["Insert"];

let lastUnreadFetchFailureLogAt = 0;

function logUnreadFetchFailed(
  userId: string,
  error: unknown,
  meta?: Record<string, unknown>,
) {
  const now = Date.now();
  // Avoid noisy repeated console spam from polls/realtime retries.
  if (now - lastUnreadFetchFailureLogAt < 15000) return;
  lastUnreadFetchFailureLogAt = now;
  console.log("UNREAD FETCH FAILED", {
    userId,
    error: extractPostgrestErrorFields(error),
    ...meta,
  });
}

function isMissingNotificationsColumnError(err: unknown, column: string): boolean {
  const parts: string[] = [];
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    for (const k of ["message", "details", "hint"] as const) {
      const v = o[k];
      if (typeof v === "string") parts.push(v);
    }
  } else if (err instanceof Error) {
    parts.push(err.message);
  }
  const blob = parts.join(" ").toLowerCase();
  const col = column.toLowerCase();
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code).toUpperCase()
      : "";
  return (
    blob.includes(col) &&
    (code === "PGRST204" ||
      code === "42703" ||
      blob.includes("does not exist") ||
      blob.includes("could not find") ||
      blob.includes("schema cache") ||
      blob.includes("unknown column"))
  );
}

/**
 * Inserts a notification row. Retries without optional FK columns when the database
 * predates a migration (missing column / stale schema cache), so inserts stay backward-compatible.
 */
export async function insertNotificationCompat(
  client: SupabaseClient<Database>,
  row: NotificationsInsert,
): Promise<{ error: unknown | null }> {
  let payload: Record<string, unknown> = { ...row };

  for (let i = 0; i < 6; i++) {
    const { error } = await client
      .from("notifications")
      .insert(payload as NotificationsInsert);

    if (!error) {
      return { error: null };
    }

    if (isMissingNotificationsColumnError(error, "related_challenge_id")) {
      const { related_challenge_id: _, ...rest } = payload;
      void _;
      payload = rest;
      continue;
    }
    if (isMissingNotificationsColumnError(error, "related_video_id")) {
      const { related_video_id: _, ...rest } = payload;
      void _;
      payload = rest;
      continue;
    }

    return { error };
  }

  return { error: new Error("notification insert: compatibility retries exhausted") };
}

/** Fallback DB text; inbox UI localizes by `type` (and message tokens) instead. */
const MESSAGES: Record<NotificationType, string> = {
  follow: "",
  like: "",
  comment: "",
  message: "",
  ai_analysis: "",
  welcome: "",
  onboarding: "",
  profile: "",
  upload: "",
  scout_verification: "",
  challenge: "",
};

function coerceOwnerUserId(data: unknown): string | null {
  if (data == null) return null;
  const s = typeof data === "string" ? data.trim() : String(data).trim();
  return s.length > 0 ? s : null;
}

/**
 * Resolves the uploader's `users.id` for a video: tries `public.video_owner_id` RPC first,
 * then falls back to `select user_id from public.videos where id = video_id`.
 * Never throws; logs clearly on RPC failure or fallback failure.
 */
export async function fetchVideoOwnerUserId(
  client: SupabaseClient<Database>,
  videoId: string,
): Promise<string | null> {
  const vid = videoId?.trim();
  if (!vid) return null;

  const { data: rpcData, error: rpcError } = await client.rpc("video_owner_id", {
    p_video_id: vid,
  });

  if (!rpcError) {
    const fromRpc = coerceOwnerUserId(rpcData);
    if (fromRpc) return fromRpc;
    logFullSupabaseError(
      "[notifications] video_owner_id RPC returned empty; falling back to videos.user_id",
      new Error("video_owner_id returned no user id"),
      { video_id: vid },
    );
  } else {
    logFullSupabaseError(
      "[notifications] video_owner_id RPC failed; falling back to videos.user_id select",
      rpcError,
      { video_id: vid },
    );
  }

  const { data: row, error: selectError } = await client
    .from("videos")
    .select("user_id")
    .eq("id", vid)
    .maybeSingle();

  if (selectError) {
    logFullSupabaseError(
      "[notifications] fetchVideoOwnerUserId videos.user_id fallback failed",
      selectError,
      { video_id: vid },
    );
    return null;
  }

  const uid = row?.user_id;
  return typeof uid === "string" && uid.length > 0 ? uid : null;
}

/**
 * Inserts a notification; never throws. Logs full Supabase errors on failure.
 */
export async function safeCreateNotification(
  client: SupabaseClient<Database>,
  params: {
    recipientUserId: string;
    type: NotificationType;
    message: string;
    relatedUserId: string;
    relatedVideoId?: string | null;
    relatedChallengeId?: string | null;
  },
): Promise<void> {
  if (!params.recipientUserId || !params.relatedUserId) {
    return;
  }
  if (params.type === "challenge") {
    logFullSupabaseError(
      "[notifications] challenge rows must be created via challenge notify RPC (server-side only)",
      new Error("invalid client insert"),
      { recipientUserId: params.recipientUserId },
    );
    return;
  }
  const selfSystemTypes: NotificationType[] = [
    "ai_analysis",
    "welcome",
    "onboarding",
    "profile",
    "upload",
    "scout_verification",
  ];
  if (
    params.recipientUserId === params.relatedUserId &&
    !selfSystemTypes.includes(params.type)
  ) {
    return;
  }

  try {
    const insertRow: NotificationsInsert = {
      user_id: params.recipientUserId,
      type: params.type,
      message: params.message,
      related_user_id: params.relatedUserId,
      related_video_id: params.relatedVideoId ?? null,
      related_challenge_id: params.relatedChallengeId ?? null,
    };

    const { error } = await insertNotificationCompat(client, insertRow);

    if (error) {
      logFullSupabaseError("[notifications] safeCreateNotification insert", error, {
        recipientUserId: params.recipientUserId,
        type: params.type,
        relatedUserId: params.relatedUserId,
        relatedVideoId: params.relatedVideoId ?? null,
        relatedChallengeId: params.relatedChallengeId ?? null,
      });
    }
  } catch (e) {
    logFullSupabaseError("[notifications] safeCreateNotification catch", e, {
      recipientUserId: params.recipientUserId,
      type: params.type,
      relatedUserId: params.relatedUserId,
      relatedVideoId: params.relatedVideoId ?? null,
      relatedChallengeId: params.relatedChallengeId ?? null,
    });
  }
}

type NotifyChallengeRpcResult = {
  ok?: boolean;
  inserted?: number;
  error?: string;
};

function isMissingChallengeNotifyRpcError(error: unknown): boolean {
  const e = error as { code?: string | null; message?: string | null } | null;
  if (e?.code !== "PGRST202") return false;
  const message = String(e?.message ?? "").toLowerCase();
  return (
    message.includes("goalnova_notify_players_about_challenge") ||
    message.includes("pitchrusch_notify_players_about_challenge")
  );
}

/**
 * Staff-only RPC: one in-app notification per player per challenge (skips duplicates).
 */
export async function notifyPlayersAboutChallengeRpc(
  client: SupabaseClient<Database>,
  challengeId: string,
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const id = challengeId?.trim();
  if (!id) {
    return { ok: false, error: "missing_challenge_id" };
  }
  try {
    const rpc = client.rpc.bind(client) as unknown as (
      fn: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
    const primary = await rpc("pitchrusch_notify_players_about_challenge", {
      p_challenge_id: id,
    });
    const { data, error } =
      primary.error?.code === "PGRST202"
        ? await rpc("goalnova_notify_players_about_challenge", {
            p_challenge_id: id,
          })
        : primary;
    if (error) {
      if (isMissingChallengeNotifyRpcError(error)) {
        // DB on older migrations: avoid noisy console error, return stable code to UI.
        return { ok: false, error: "rpc_missing" };
      }
      logFullSupabaseError("[notifications] notifyPlayersAboutChallengeRpc", error, {
        challengeId: id,
      });
      return { ok: false, error: error.message ?? "rpc_failed" };
    }
    const row = data as NotifyChallengeRpcResult | null;
    if (!row || row.ok !== true) {
      const code =
        row && typeof row.error === "string" && row.error.length > 0
          ? row.error
          : "rpc_rejected";
      return { ok: false, error: code };
    }
    const inserted =
      typeof row.inserted === "number" && Number.isFinite(row.inserted)
        ? row.inserted
        : 0;
    return { ok: true, inserted };
  } catch (e) {
    logFullSupabaseError("[notifications] notifyPlayersAboutChallengeRpc catch", e, {
      challengeId: id,
    });
    return { ok: false, error: "unexpected" };
  }
}

export function scheduleFollowNotification(
  followerId: string,
  followingId: string,
): void {
  void safeCreateNotification(supabase, {
    recipientUserId: followingId,
    type: "follow",
    message: MESSAGES.follow,
    relatedUserId: followerId,
  });
}

export function scheduleVideoLikedNotification(
  client: SupabaseClient<Database>,
  videoId: string,
  likerId: string,
): void {
  void (async () => {
    const ownerId = await fetchVideoOwnerUserId(client, videoId);
    if (!ownerId || ownerId === likerId) return;
    await safeCreateNotification(client, {
      recipientUserId: ownerId,
      type: "like",
      message: MESSAGES.like,
      relatedUserId: likerId,
      relatedVideoId: videoId,
    });
  })();
}

/**
 * Best-effort comment notification for the video owner. Resolves owner via RPC + `videos` fallback.
 * Does not block callers; failures only affect the notification row.
 */
export function scheduleVideoCommentNotification(
  client: SupabaseClient<Database>,
  videoId: string,
  commenterId: string,
): void {
  void (async () => {
    const ownerId = await fetchVideoOwnerUserId(client, videoId);
    if (!ownerId || ownerId === commenterId) return;
    await safeCreateNotification(client, {
      recipientUserId: ownerId,
      type: "comment",
      message: MESSAGES.comment,
      relatedUserId: commenterId,
      relatedVideoId: videoId,
    });
  })();
}

export function scheduleMessageNotification(
  client: SupabaseClient<Database>,
  receiverId: string,
  senderId: string,
  messageText: string,
): void {
  const preview = messageText.trim();
  const body =
    preview.length > 120 ? `${preview.slice(0, 120)}…` : preview;
  void safeCreateNotification(client, {
    recipientUserId: receiverId,
    type: "message",
    message: body,
    relatedUserId: senderId,
  });
}

export function scheduleAiAnalysisNotification(
  client: SupabaseClient<Database>,
  videoId: string,
  analystUserId: string,
): void {
  void (async () => {
    const ownerId = await fetchVideoOwnerUserId(client, videoId);
    if (!ownerId) return;
    await safeCreateNotification(client, {
      recipientUserId: ownerId,
      type: "ai_analysis",
      message: MESSAGES.ai_analysis,
      relatedUserId: analystUserId,
      relatedVideoId: videoId,
    });
  })();
}

export async function fetchUnreadNotificationCount(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ count: number; error: PostgrestErrorFields | null }> {
  const currentUserId = userId.trim();
  if (!currentUserId) {
    console.log("UNREAD COUNT", { currentUserId, count: 0 });
    return { count: 0, error: null };
  }
  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", currentUserId)
    .eq("is_read", false);

  if (error) {
    logFullSupabaseError("[notifications] fetchUnreadNotificationCount", error, {
      userId,
    });
    return { count: 0, error: extractPostgrestErrorFields(error) };
  }
  const unread = count ?? 0;
  console.log("UNREAD COUNT", { currentUserId, count: unread });
  return { count: unread, error: null };
}

/** Unread rows excluding DM-related notification types (handled by inbox/thread read actions). */
export async function fetchUnreadNonMessageNotificationCount(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ count: number; error: PostgrestErrorFields | null }> {
  const currentUserId = userId.trim();
  if (!currentUserId) {
    return { count: 0, error: null };
  }

  const missingEnv: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingEnv.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missingEnv.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (missingEnv.length > 0) {
    const envError = new Error(
      `Missing Supabase env var(s): ${missingEnv.join(", ")}`,
    );
    logUnreadFetchFailed(currentUserId, envError, { missingEnv });
    return { count: 0, error: extractPostgrestErrorFields(envError) };
  }

  const run = async () =>
    client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false)
      .not("type", "in", "(message,admin_notice)");

  try {
    let res = await run();
    if (!res.error) {
      return { count: res.count ?? 0, error: null };
    }

    const firstError = res.error;
    const parsedFirst = extractPostgrestErrorFields(firstError);
    const authExpired =
      parsedFirst.status === 401 ||
      parsedFirst.status === 403 ||
      parsedFirst.message.toLowerCase().includes("jwt") ||
      parsedFirst.message.toLowerCase().includes("token");
    if (authExpired) {
      await client.auth.refreshSession();
      res = await run();
      if (!res.error) return { count: res.count ?? 0, error: null };
    } else {
      // Single retry for transient/non-auth request failures.
      res = await run();
      if (!res.error) return { count: res.count ?? 0, error: null };
    }

    if (!isLikelyTransientNetworkFailure(res.error)) {
      logFullSupabaseError("[notifications] fetchUnreadNonMessageNotificationCount", res.error, {
        userId,
      });
    }
    logUnreadFetchFailed(currentUserId, res.error, { retried: true });
    return { count: 0, error: extractPostgrestErrorFields(res.error) };
  } catch (err) {
    // Handle thrown fetch/network errors safely.
    if (!isLikelyTransientNetworkFailure(err)) {
      logFullSupabaseError("[notifications] fetchUnreadNonMessageNotificationCount", err, {
        userId,
      });
    }
    logUnreadFetchFailed(currentUserId, err, { retried: true, thrown: true });
    return { count: 0, error: extractPostgrestErrorFields(err) };
  }
}

/** Unread `type = message` notification rows (diagnostics vs distinct-peer badge). */
export async function fetchUnreadMessageNotificationRowCount(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ count: number; error: PostgrestErrorFields | null }> {
  const currentUserId = userId.trim();
  if (!currentUserId) {
    return { count: 0, error: null };
  }
  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", currentUserId)
    .eq("type", "message")
    .eq("is_read", false);

  if (error) {
    logFullSupabaseError("[notifications] fetchUnreadMessageNotificationRowCount", error, {
      userId,
    });
    return { count: 0, error: extractPostgrestErrorFields(error) };
  }
  return { count: count ?? 0, error: null };
}

/**
 * Marks every unread DM-related notification row read for the user (inbox opened).
 * Prevents orphaned `type = message/admin_notice` rows from inflating totals.
 */
export async function markAllUnreadMessageNotificationsRead(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: PostgrestErrorFields }> {
  const uid = userId.trim();
  if (!uid) return { ok: true };

  const [messageRes, adminNoticeRes] = await Promise.all([
    client
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", uid)
      .eq("type", "message")
      .eq("is_read", false),
    client
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", uid)
      .eq("type", "admin_notice")
      .eq("is_read", false),
  ]);
  const error = messageRes.error ?? adminNoticeRes.error;

  if (error) {
    logFullSupabaseError("[notifications] markAllUnreadMessageNotificationsRead", error, {
      userId: uid,
    });
    return { ok: false, error: extractPostgrestErrorFields(error) };
  }
  return { ok: true };
}

/** Best-effort parse of a Realtime postgres_changes payload into a row shape. */
export function notificationRowFromRealtimePayload(
  payload: unknown,
): NotificationRow | null {
  if (!payload || typeof payload !== "object") return null;
  const r = payload as Record<string, unknown>;
  const id = r.id;
  const user_id = r.user_id;
  const type = r.type;
  const message = r.message;
  const related_user_id = r.related_user_id;
  const created_at = r.created_at;
  if (
    typeof id !== "string" ||
    typeof user_id !== "string" ||
    typeof type !== "string" ||
    typeof message !== "string" ||
    typeof related_user_id !== "string" ||
    typeof created_at !== "string"
  ) {
    return null;
  }
  const related_video_id =
    r.related_video_id === null || r.related_video_id === undefined
      ? null
      : typeof r.related_video_id === "string"
        ? r.related_video_id
        : null;
  const related_challenge_id =
    r.related_challenge_id === null || r.related_challenge_id === undefined
      ? null
      : typeof r.related_challenge_id === "string"
        ? r.related_challenge_id
        : null;
  const is_read = typeof r.is_read === "boolean" ? r.is_read : false;
  return {
    id,
    user_id,
    type,
    message,
    related_user_id,
    related_video_id,
    related_challenge_id,
    is_read,
    created_at,
  };
}

export async function fetchNotificationsForUser(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{
  rows: NotificationRow[];
  error: PostgrestErrorFields | null;
}> {
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    logFullSupabaseError("[notifications] fetchNotificationsForUser", error, {
      userId,
    });
    return { rows: [], error: extractPostgrestErrorFields(error) };
  }

  return { rows: (data ?? []) as NotificationRow[], error: null };
}

export async function markNotificationRead(
  client: SupabaseClient<Database>,
  userId: string,
  notificationId: string,
): Promise<{ ok: true } | { ok: false; error: PostgrestErrorFields }> {
  console.log("MARK NOTIFICATION READ", {
    notificationId,
    currentUserId: userId,
  });
  const { data, error } = await client
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id");

  console.log("MARK NOTIFICATION READ RESULT", {
    notificationId,
    currentUserId: userId,
    data,
    error,
  });

  if (error) {
    logFullSupabaseError("[notifications] markNotificationRead", error, {
      userId,
      notificationId,
    });
    return { ok: false, error: extractPostgrestErrorFields(error) };
  }
  const unreadAfter = await fetchUnreadNotificationCount(client, userId);
  console.log("UNREAD COUNT AFTER MARK READ", {
    currentUserId: userId,
    notificationId,
    unreadCount: unreadAfter.count,
    error: unreadAfter.error,
  });
  return { ok: true };
}

export async function markAllNotificationsRead(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: PostgrestErrorFields }> {
  const { error } = await client
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    logFullSupabaseError("[notifications] markAllNotificationsRead", error, {
      userId,
    });
    return { ok: false, error: extractPostgrestErrorFields(error) };
  }
  return { ok: true };
}

/**
 * Marks unread message notifications from one DM peer as read.
 * Helps keep the inbox badge in sync once a conversation is opened.
 */
export async function markThreadMessageNotificationsRead(
  client: SupabaseClient<Database>,
  userId: string,
  otherUserId: string,
): Promise<{ ok: true } | { ok: false; error: PostgrestErrorFields }> {
  const uid = userId.trim();
  const other = otherUserId.trim();
  if (!uid || !other) return { ok: true };

  console.log("MARK THREAD NOTIFICATIONS READ", {
    currentUserId: uid,
    otherUserId: other,
  });
  const [messageRes, adminNoticeRes] = await Promise.all([
    client
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", uid)
      .eq("type", "message")
      .eq("related_user_id", other)
      .eq("is_read", false)
      .select("id"),
    client
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", uid)
      .eq("type", "admin_notice")
      .eq("related_user_id", other)
      .eq("is_read", false)
      .select("id"),
  ]);
  const data = [
    ...(messageRes.data ?? []),
    ...(adminNoticeRes.data ?? []),
  ];
  const error = messageRes.error ?? adminNoticeRes.error;

  console.log("MARK THREAD NOTIFICATIONS READ RESULT", {
    currentUserId: uid,
    otherUserId: other,
    messageMarked: (messageRes.data ?? []).length,
    adminNoticeMarked: (adminNoticeRes.data ?? []).length,
    data,
    error,
  });

  if (error) {
    logFullSupabaseError("[notifications] markThreadMessageNotificationsRead", error, {
      userId: uid,
      otherUserId: other,
    });
    return { ok: false, error: extractPostgrestErrorFields(error) };
  }
  const unreadAfter = await fetchUnreadNotificationCount(client, uid);
  console.log("UNREAD COUNT AFTER THREAD MARK READ", {
    currentUserId: uid,
    otherUserId: other,
    unreadCount: unreadAfter.count,
    error: unreadAfter.error,
  });
  return { ok: true };
}

async function deleteNotificationViaTable(
  client: SupabaseClient<Database>,
  userId: string,
  notificationId: string,
): Promise<{ ok: true } | { ok: false; error: PostgrestErrorFields }> {
  console.log("DELETE NOTIFICATION", { notificationId, currentUserId: userId });
  const { data, error } = await client
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId);

  console.log("DELETE RESULT", { data, error });

  if (error) {
    const fields = extractPostgrestErrorFields(error);
    console.error("[notifications] deleteNotificationViaTable failed", {
      message: fields.message,
      code: fields.code,
      details: fields.details,
      hint: fields.hint,
      userId,
      notificationId,
    });
    logFullSupabaseError("[notifications] deleteNotificationViaTable", error, {
      userId,
      notificationId,
    });
    return { ok: false, error: fields };
  }
  return { ok: true };
}

/** Deletes one notification row for the signed-in recipient. */
export async function deleteNotificationForUser(
  client: SupabaseClient<Database>,
  userId: string,
  notificationId: string,
): Promise<{ ok: true } | { ok: false; error: PostgrestErrorFields }> {
  const nid = notificationId?.trim();
  if (!nid) {
    return {
      ok: false,
      error: {
        message: "Invalid notification id.",
        code: "invalid_id",
        details: null,
        hint: null,
        status: null,
      },
    };
  }
  return deleteNotificationViaTable(client, userId, nid);
}

export async function deleteReadNotificationsForUser(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: PostgrestErrorFields }> {
  console.log("DELETE READ NOTIFICATIONS", { currentUserId: userId });
  const { data, error } = await client
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("is_read", true);

  console.log("DELETE RESULT", { data, error });

  if (error) {
    const fields = extractPostgrestErrorFields(error);
    console.error("[notifications] deleteReadNotificationsForUser failed", {
      message: fields.message,
      code: fields.code,
      details: fields.details,
      hint: fields.hint,
      userId,
    });
    logFullSupabaseError("[notifications] deleteReadNotificationsForUser", error, {
      userId,
    });
    return { ok: false, error: fields };
  }
  return { ok: true };
}

export async function deleteAllNotificationsForUser(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: PostgrestErrorFields }> {
  console.log("DELETE ALL NOTIFICATIONS", { currentUserId: userId });
  const { data, error } = await client.from("notifications").delete().eq("user_id", userId);

  console.log("DELETE RESULT", { data, error });

  if (error) {
    const fields = extractPostgrestErrorFields(error);
    console.error("[notifications] deleteAllNotificationsForUser failed", {
      message: fields.message,
      code: fields.code,
      details: fields.details,
      hint: fields.hint,
      userId,
    });
    logFullSupabaseError("[notifications] deleteAllNotificationsForUser", error, {
      userId,
    });
    return { ok: false, error: fields };
  }
  return { ok: true };
}
