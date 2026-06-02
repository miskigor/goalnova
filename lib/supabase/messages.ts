import { supabase } from "./client";
import type {
  PublicMessagesInsert,
  PublicMessagesRow,
} from "./database.types";
import { devLog, devWarn } from "@/lib/devLog";
import {
  extractPostgrestErrorFields,
  logFullSupabaseError,
  supabaseErrorToUserMessage,
} from "./logError";
import { scheduleMessageNotification } from "./notifications";
import { fetchVerifiedScoutFlagsForUserIds } from "./scoutVerificationPublic";

/** `public.messages` row shape from `Database` (regenerate `database.types.ts` from Supabase when DDL changes). */
export type MessageRow = PublicMessagesRow;

/**
 * Every column we read from `public.messages` for the messaging UI.
 * `satisfies` enforces this list stays aligned with `PublicMessagesRow` keys.
 */
const MESSAGE_ROW_KEYS = [
  "id",
  "sender_id",
  "receiver_id",
  "message",
  "created_at",
  "deleted_for_sender",
  "deleted_for_recipient",
] as const;

type _MessageRowKeysMatchDatabase =
  Exclude<keyof PublicMessagesRow, (typeof MESSAGE_ROW_KEYS)[number]> extends never
    ? Exclude<(typeof MESSAGE_ROW_KEYS)[number], keyof PublicMessagesRow> extends never
      ? true
      : never
    : never;
const _messageRowKeysMatchDatabase: _MessageRowKeysMatchDatabase = true;
void _messageRowKeysMatchDatabase;

/** PostgREST select list derived from `MESSAGE_ROW_KEYS` (no separate hard-coded string). */
export const MESSAGES_TABLE_SELECT = MESSAGE_ROW_KEYS.join(", ");

const SCHEMA_MISMATCH_USER_HINT = `Server data does not match Database["public"]["Tables"]["messages"]["Row"] (expected columns: ${MESSAGE_ROW_KEYS.join(", ")}). Regenerate lib/supabase/database.types.ts from your Supabase project if the schema changed.`;

/** PostgREST / drivers sometimes return booleans as strings; never treat that as schema failure. */
export function coerceDeletedFlag(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return s === "true" || s === "t" || s === "1";
  }
  if (typeof value === "number" && value === 1) return true;
  return false;
}

type MessageRowParseFailure = {
  missing: string[];
  wrongType: string[];
  extraKeys: string[];
  keysReceived: string[];
  rawKind: string;
};

function analyzeMessageRow(
  raw: unknown,
): { ok: true; row: MessageRow } | { ok: false; failure: MessageRowParseFailure } {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      failure: {
        missing: [...MESSAGE_ROW_KEYS],
        wrongType: [],
        extraKeys: [],
        keysReceived: [],
        rawKind: raw === null ? "null" : typeof raw,
      },
    };
  }

  const o = raw as Record<string, unknown>;
  const missing: string[] = [];
  const wrongType: string[] = [];

  for (const key of MESSAGE_ROW_KEYS) {
    const v = o[key];
    if (key === "deleted_for_sender" || key === "deleted_for_recipient") {
      if (v !== undefined && v !== null && typeof v !== "boolean") {
        wrongType.push(`${key}(${typeof v})`);
      }
      continue;
    }
    if (v === undefined || v === null) {
      missing.push(key);
      continue;
    }
    if (typeof v !== "string") {
      wrongType.push(`${key}(${typeof v})`);
    }
  }

  const keySet = new Set<string>(MESSAGE_ROW_KEYS as readonly string[]);
  const extraKeys = Object.keys(o).filter((k) => !keySet.has(k));

  if (missing.length > 0 || wrongType.length > 0) {
    return {
      ok: false,
      failure: {
        missing,
        wrongType,
        extraKeys,
        keysReceived: Object.keys(o),
        rawKind: "object",
      },
    };
  }

  const deleted_for_sender = coerceDeletedFlag(o.deleted_for_sender);
  const deleted_for_recipient = coerceDeletedFlag(o.deleted_for_recipient);

  return {
    ok: true,
    row: {
      ...(o as MessageRow),
      deleted_for_sender,
      deleted_for_recipient,
    },
  };
}

function logMessageRowMismatch(
  source: string,
  failure: MessageRowParseFailure,
) {
  logFullSupabaseError(
    `[messages] SCHEMA MISMATCH — public.messages row must match Database types (columns: ${MESSAGE_ROW_KEYS.join(", ")}; string values from PostgREST). Regenerate database.types.ts if needed.`,
    new Error("MESSAGES_SCHEMA_MISMATCH"),
    { source, ...failure },
  );
}

/**
 * Validates a single row from `public.messages`. Logs a clear error on mismatch.
 * Use for Realtime payloads and any untyped JSON.
 */
export function parseMessageRow(
  raw: unknown,
  source: string,
): MessageRow | null {
  const result = analyzeMessageRow(raw);
  if (result.ok) return result.row;
  logMessageRowMismatch(source, result.failure);
  return null;
}

function sanitizeMessageRows(
  raw: unknown[] | null | undefined,
  source: string,
): { rows: MessageRow[]; allRejected: boolean } {
  const list = raw ?? [];
  const rows: MessageRow[] = [];
  let rejected = 0;
  let firstFailure: MessageRowParseFailure | null = null;

  for (const r of list) {
    const result = analyzeMessageRow(r);
    if (result.ok) {
      rows.push(result.row);
    } else {
      rejected += 1;
      firstFailure ??= result.failure;
    }
  }

  const allRejected = list.length > 0 && rows.length === 0 && rejected > 0;
  if (rejected > 0) {
    logFullSupabaseError(
      "[messages] SCHEMA MISMATCH — one or more message rows failed validation after fetch",
      new Error("MESSAGES_SCHEMA_MISMATCH"),
      {
        source,
        accepted: rows.length,
        rejected,
        total: list.length,
        firstRowIssue: firstFailure,
      },
    );
  }
  return { rows, allRejected };
}

export type ConversationSummary = {
  otherUserId: string;
  displayName: string;
  lastMessage: string;
  lastAt: string;
  /** True when the other participant is a trusted scout (`role` + `scout_verification_status`). */
  otherIsVerifiedScout: boolean;
};

export const PITCHRUSCH_SENDER_SUPPORT = "PitchRusch Team";
export const PITCHRUSCH_SENDER_SAFETY = "PitchRusch Team";
export const PITCHRUSCH_SENDER_VERIFICATION = "PitchRusch Team";

function normalizeForNoticeMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function classifyAdminNoticeSenderByMessage(message: string): string {
  const m = normalizeForNoticeMatch(message);
  if (!m) return PITCHRUSCH_SENDER_SUPPORT;

  const verificationHints = [
    "scout verification",
    "verifikaciju skauta",
    "scout-verifizierungsinformationen",
    "verifica scout",
    "verification de votre compte scout",
    "verificacion de scout",
  ];
  if (verificationHints.some((hint) => m.includes(normalizeForNoticeMatch(hint)))) {
    return PITCHRUSCH_SENDER_VERIFICATION;
  }

  const safetyHints = [
    "community guidelines",
    "smjernice zajednice",
    "community-richtlinien",
    "linee guida della community",
    "regles de la communaute",
    "normas de la comunidad",
    "inappropriate",
    "neprikladan",
    "unangemessene",
    "inappropriati",
    "inapproprie",
    "inapropiado",
    "final warning",
    "posljednje upozorenje",
    "zadnje upozorenje",
    "letzte warnung",
    "avvertimento finale",
    "dernier avertissement",
    "advertencia final",
    "suspended",
    "suspendiran",
    "gesperrt",
    "sospeso",
    "suspendu",
    "suspendida",
  ];
  if (safetyHints.some((hint) => m.includes(normalizeForNoticeMatch(hint)))) {
    return PITCHRUSCH_SENDER_SAFETY;
  }

  return PITCHRUSCH_SENDER_SUPPORT;
}

async function fetchOfficialAdminNoticeSenderLabels(
  currentUserId: string,
  otherUserIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(otherUserIds.filter(Boolean))];
  const out = new Map<string, string>();
  if (ids.length === 0) return out;

  const { data, error } = await supabase
    .from("notifications")
    .select("related_user_id,message,created_at")
    .eq("user_id", currentUserId)
    .eq("type", "admin_notice")
    .in("related_user_id", ids)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    logFullSupabaseError("[messages] fetchOfficialAdminNoticeSenderLabels", error, {
      currentUserId,
      relatedCount: ids.length,
    });
    return out;
  }

  for (const row of data ?? []) {
    const relatedId = row.related_user_id?.trim();
    if (!relatedId || out.has(relatedId)) continue;
    out.set(relatedId, classifyAdminNoticeSenderByMessage(row.message ?? ""));
  }
  return out;
}

type OfficialAdminNoticeMeta = {
  message: string;
  createdAt: string;
  label: string;
};

async function fetchLatestOfficialAdminNoticeMeta(
  currentUserId: string,
  otherUserIds: string[],
): Promise<Map<string, OfficialAdminNoticeMeta>> {
  const ids = [...new Set(otherUserIds.filter(Boolean))];
  const out = new Map<string, OfficialAdminNoticeMeta>();
  if (ids.length === 0) return out;

  const { data, error } = await supabase
    .from("notifications")
    .select("related_user_id,message,created_at")
    .eq("user_id", currentUserId)
    .eq("type", "admin_notice")
    .in("related_user_id", ids)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    logFullSupabaseError("[messages] fetchLatestOfficialAdminNoticeMeta", error, {
      currentUserId,
      relatedCount: ids.length,
    });
    return out;
  }

  for (const row of data ?? []) {
    const relatedId = row.related_user_id?.trim();
    const message = (row.message ?? "").trim();
    const createdAt = (row.created_at ?? "").trim();
    if (!relatedId || !message || !createdAt || out.has(relatedId)) continue;
    out.set(relatedId, {
      message,
      createdAt,
      label: classifyAdminNoticeSenderByMessage(message),
    });
  }
  return out;
}

function shouldUseOfficialAdminNoticeLabel(
  latestMessage: string,
  latestAt: string,
  notice: OfficialAdminNoticeMeta | null,
): boolean {
  if (!notice) return false;
  if (latestMessage.trim() !== notice.message.trim()) return false;
  const lastAtMs = new Date(latestAt).getTime();
  const noticeMs = new Date(notice.createdAt).getTime();
  if (!Number.isFinite(lastAtMs) || !Number.isFinite(noticeMs)) return false;
  // Message mirror from admin_notice is created nearly at same time.
  return Math.abs(lastAtMs - noticeMs) <= 120000;
}

export async function fetchOfficialAdminNoticeSenderLabel(
  currentUserId: string,
  otherUserId: string,
): Promise<string | null> {
  const map = await fetchOfficialAdminNoticeSenderLabels(currentUserId, [otherUserId]);
  return map.get(otherUserId) ?? null;
}

export async function fetchOfficialAdminNoticeSenderLabelForLatestMessage(
  currentUserId: string,
  otherUserId: string,
  latestMessage: string,
  latestAt: string,
): Promise<string | null> {
  const map = await fetchLatestOfficialAdminNoticeMeta(currentUserId, [otherUserId]);
  const notice = map.get(otherUserId) ?? null;
  if (!shouldUseOfficialAdminNoticeLabel(latestMessage, latestAt, notice)) {
    return null;
  }
  return notice?.label ?? PITCHRUSCH_SENDER_SUPPORT;
}

const INBOX_MESSAGE_LIMIT = 400;

function otherParticipantId(row: MessageRow, currentUserId: string): string {
  return row.sender_id === currentUserId ? row.receiver_id : row.sender_id;
}

/**
 * Collapse recent messages into one row per conversation partner (latest activity).
 */
export function buildConversationSummariesFromRows(
  rows: MessageRow[],
  currentUserId: string,
): Map<string, { lastMessage: string; lastAt: string }> {
  const byOther = new Map<string, { lastMessage: string; lastAt: string }>();
  for (const row of rows) {
    const other = otherParticipantId(row, currentUserId);
    const at = row.created_at;
    const prev = byOther.get(other);
    if (!prev || new Date(at).getTime() > new Date(prev.lastAt).getTime()) {
      byOther.set(other, { lastMessage: row.message, lastAt: at });
    }
  }
  return byOther;
}

/**
 * Threads where the latest visible message is from the other participant (incoming),
 * used as a simple unread badge when messages have no per-row read flag.
 */
export function countUnreadIncomingThreads(
  rows: MessageRow[],
  currentUserId: string,
): number {
  const latestByOther = new Map<string, MessageRow>();
  for (const row of rows) {
    const other = otherParticipantId(row, currentUserId);
    const prev = latestByOther.get(other);
    if (
      !prev ||
      new Date(row.created_at).getTime() > new Date(prev.created_at).getTime()
    ) {
      latestByOther.set(other, row);
    }
  }
  let n = 0;
  for (const row of latestByOther.values()) {
    if (row.sender_id !== currentUserId) n += 1;
  }
  return n;
}

export async function fetchUnreadMessageThreadCount(
  currentUserId: string,
): Promise<{ count: number; errorMessage: string | null }> {
  const { rows, errorMessage } = await fetchInboxMessages(currentUserId);
  if (errorMessage) {
    return { count: 0, errorMessage };
  }
  return {
    count: countUnreadIncomingThreads(rows, currentUserId),
    errorMessage: null,
  };
}

export async function fetchDisplayNamesForUserIds(
  userIds: string[],
  unknownLabel: string,
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  const out = new Map<string, string>();

  if (unique.length === 0) return out;

  const { data: players, error: playersError } = await supabase
    .from("player_profiles")
    .select("id, full_name, username")
    .in("id", unique);

  if (playersError) {
    logFullSupabaseError("[messages] fetchDisplayNames player_profiles", playersError, {
      count: unique.length,
    });
  }

  for (const row of players ?? []) {
    const name =
      row.full_name?.trim() ||
      row.username?.trim() ||
      null;
    if (name) out.set(row.id, name);
  }

  const stillNeed = unique.filter((id) => !out.has(id));
  if (stillNeed.length === 0) return out;

  const { data: scouts, error: scoutsError } = await supabase.rpc(
    "get_scout_profile_display_names",
    { p_user_ids: stillNeed },
  );

  if (scoutsError) {
    logFullSupabaseError("[messages] fetchDisplayNames get_scout_profile_display_names", scoutsError, {
      count: stillNeed.length,
    });
  }

  for (const row of scouts ?? []) {
    const label = row.display_name?.trim() || row.organization?.trim();
    if (label) out.set(row.id, label);
  }

  const stillNeed2 = unique.filter((id) => !out.has(id));
  if (stillNeed2.length === 0) return out;

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email")
    .in("id", stillNeed2);

  if (usersError) {
    logFullSupabaseError("[messages] fetchDisplayNames users", usersError, {
      count: stillNeed2.length,
    });
  }

  for (const row of users ?? []) {
    const email = row.email?.trim();
    if (email) {
      const short = email.includes("@") ? email.split("@")[0] : email;
      out.set(row.id, short || unknownLabel);
    }
  }

  for (const id of unique) {
    if (!out.has(id)) out.set(id, unknownLabel);
  }

  return out;
}

function mergeMessageRowsNewestFirst(
  parts: (MessageRow[] | null | undefined)[],
  limit: number,
): MessageRow[] {
  const byId = new Map<string, MessageRow>();
  for (const part of parts) {
    for (const r of part ?? []) {
      byId.set(r.id, r);
    }
  }
  return [...byId.values()]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, limit);
}

export async function fetchInboxMessages(
  currentUserId: string,
): Promise<{ rows: MessageRow[]; errorMessage: string | null }> {
  const [sent, received] = await Promise.all([
    supabase
      .from("messages")
      .select(MESSAGES_TABLE_SELECT)
      .eq("sender_id", currentUserId)
      .eq("deleted_for_sender", false)
      .order("created_at", { ascending: false })
      .limit(INBOX_MESSAGE_LIMIT),
    supabase
      .from("messages")
      .select(MESSAGES_TABLE_SELECT)
      .eq("receiver_id", currentUserId)
      .eq("deleted_for_recipient", false)
      .order("created_at", { ascending: false })
      .limit(INBOX_MESSAGE_LIMIT),
  ]);

  const firstErr = sent.error ?? received.error;
  if (firstErr) {
    logFullSupabaseError("[messages] fetchInboxMessages", firstErr, { currentUserId });
    return { rows: [], errorMessage: supabaseErrorToUserMessage(firstErr) };
  }

  const merged = mergeMessageRowsNewestFirst(
    [
      (sent.data ?? []) as unknown as MessageRow[],
      (received.data ?? []) as unknown as MessageRow[],
    ],
    INBOX_MESSAGE_LIMIT,
  );
  const { rows, allRejected } = sanitizeMessageRows(merged, "fetchInboxMessages");
  if (allRejected) {
    return { rows: [], errorMessage: SCHEMA_MISMATCH_USER_HINT };
  }
  return { rows, errorMessage: null };
}

/**
 * Messages between exactly two users (ordered oldest → newest).
 * Filter: (sender_id = me AND receiver_id = them) OR (sender_id = them AND receiver_id = me)
 */
export async function fetchConversationMessages(
  currentUserId: string,
  otherUserId: string,
): Promise<{ rows: MessageRow[]; errorMessage: string | null }> {
  const THREAD_LIMIT = 500;
  const visibleInThreadFilter = [
    `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId},deleted_for_sender.eq.false)`,
    `and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId},deleted_for_recipient.eq.false)`,
  ].join(",");

  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGES_TABLE_SELECT)
    .or(visibleInThreadFilter)
    .order("created_at", { ascending: true })
    .limit(THREAD_LIMIT);

  if (error) {
    logFullSupabaseError(
      "[messages] fetchConversationMessages",
      error,
      { currentUserId, otherUserId },
    );
    return { rows: [], errorMessage: supabaseErrorToUserMessage(error) };
  }

  const { rows, allRejected } = sanitizeMessageRows(
    (data ?? []) as unknown as MessageRow[],
    "fetchConversationMessages",
  );
  devLog("[messages] fetchConversationMessages rows", {
    currentUserId,
    chatPartnerId: otherUserId,
    fetchedRowsCount: rows.length,
  });
  for (const row of rows) {
    devLog("[messages] fetchConversationMessages row", {
      currentUserId,
      chatPartnerId: otherUserId,
      id: row.id,
      sender_id: row.sender_id,
      receiver_id: row.receiver_id,
      deleted_for_sender: row.deleted_for_sender,
      deleted_for_recipient: row.deleted_for_recipient,
    });
  }
  if (allRejected) {
    return { rows: [], errorMessage: SCHEMA_MISMATCH_USER_HINT };
  }
  return { rows, errorMessage: null };
}

export async function sendDirectMessage(params: {
  senderId: string;
  receiverId: string;
  message: string;
}): Promise<
  { ok: true; row: MessageRow } | { ok: false; errorMessage: string }
> {
  const trimmed = params.message.trim();
  if (!trimmed) {
    return { ok: false, errorMessage: "Message is empty." };
  }
  if (params.senderId === params.receiverId) {
    return { ok: false, errorMessage: "Cannot message yourself." };
  }

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const sessionSenderId = authData.user?.id?.trim() ?? "";
  if (authErr || !sessionSenderId) {
    return { ok: false, errorMessage: "You must be signed in to send a message." };
  }
  if (sessionSenderId !== params.senderId) {
    devWarn("[messages] sendDirectMessage senderId param does not match session; using session user", {
      paramSenderId: params.senderId,
      sessionSenderId,
    });
  }
  if (sessionSenderId === params.receiverId) {
    return { ok: false, errorMessage: "Cannot message yourself." };
  }

  const insertPayload: PublicMessagesInsert = {
    sender_id: sessionSenderId,
    receiver_id: params.receiverId,
    message: trimmed,
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(insertPayload)
    .select(MESSAGES_TABLE_SELECT)
    .single();

  if (error) {
    const f = extractPostgrestErrorFields(error);
    const isRlsDenied = f.code === "42501";
    devLog("[PitchRusch][messages] sendDirectMessage insert error payload", {
      senderId: sessionSenderId,
      receiverId: params.receiverId,
      messageLength: trimmed.length,
      ...f,
    });
    if (isRlsDenied) {
      // Common when DB RLS policies are missing/outdated in the target environment.
      devWarn("[messages] sendDirectMessage blocked by RLS policy", {
        senderId: sessionSenderId,
        receiverId: params.receiverId,
        messageLength: trimmed.length,
      });
      return {
        ok: false,
        errorMessage:
          "Messaging is currently unavailable for this account. Please contact support or re-apply latest Supabase messaging policies.",
      };
    }
    logFullSupabaseError("[messages] sendDirectMessage insert", error, {
      senderId: sessionSenderId,
      receiverId: params.receiverId,
      messageLength: trimmed.length,
    });
    return { ok: false, errorMessage: supabaseErrorToUserMessage(error) };
  }

  if (!data) {
    devLog("[PitchRusch][messages] sendDirectMessage no row after insert", {
      senderId: sessionSenderId,
      receiverId: params.receiverId,
    });
    return { ok: false, errorMessage: "No row returned after send." };
  }

  const row = parseMessageRow(data, "sendDirectMessage.select");
  if (!row) {
    return { ok: false, errorMessage: SCHEMA_MISMATCH_USER_HINT };
  }
  devLog("[PitchRusch][messages] sendDirectMessage insert ok", {
    messageId: row.id,
    senderId: sessionSenderId,
    receiverId: params.receiverId,
  });
  scheduleMessageNotification(supabase, params.receiverId, sessionSenderId, trimmed);
  return { ok: true, row };
}

/** True if the row belongs to the DM thread between me and them. */
export function isMessageInConversation(
  row: Pick<MessageRow, "sender_id" | "receiver_id">,
  me: string,
  them: string,
): boolean {
  return (
    (row.sender_id === me && row.receiver_id === them) ||
    (row.sender_id === them && row.receiver_id === me)
  );
}

export async function buildInboxSummaries(
  currentUserId: string,
  unknownUserLabel: string,
): Promise<{
  conversations: ConversationSummary[];
  errorMessage: string | null;
}> {
  const { rows, errorMessage } = await fetchInboxMessages(currentUserId);
  if (errorMessage) {
    return { conversations: [], errorMessage };
  }

  const byOther = buildConversationSummariesFromRows(rows, currentUserId);
  const otherIds = [...byOther.keys()];
  const names = await fetchDisplayNamesForUserIds(otherIds, unknownUserLabel);
  const officialNoticeMeta = await fetchLatestOfficialAdminNoticeMeta(
    currentUserId,
    otherIds,
  );
  const verifiedFlags = await fetchVerifiedScoutFlagsForUserIds(otherIds);

  const conversations: ConversationSummary[] = otherIds
    .map((otherUserId) => {
      const meta = byOther.get(otherUserId)!;
      const notice = officialNoticeMeta.get(otherUserId) ?? null;
      const useTeamLabel = shouldUseOfficialAdminNoticeLabel(
        meta.lastMessage,
        meta.lastAt,
        notice,
      );
      return {
        otherUserId,
        displayName: useTeamLabel
          ? (notice?.label ?? PITCHRUSCH_SENDER_SUPPORT)
          : (names.get(otherUserId) ?? unknownUserLabel),
        lastMessage: meta.lastMessage,
        lastAt: meta.lastAt,
        otherIsVerifiedScout: verifiedFlags.get(otherUserId) ?? false,
      };
    })
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  return { conversations, errorMessage: null };
}
