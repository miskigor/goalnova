"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  fetchOfficialAdminNoticeSenderLabelForLatestMessage,
  fetchConversationMessages,
  fetchDisplayNamesForUserIds,
  isMessageInConversation,
  type MessageRow,
  parseMessageRow,
  sendDirectMessage,
} from "@/lib/supabase/messages";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { useNotificationsInboxOptional } from "@/components/notifications/NotificationsInboxContext";
import { markThreadMessageNotificationsRead } from "@/lib/supabase/notifications";
import { useAppFeedback } from "@/components/feedback/FeedbackProvider";
import { devLog, devTable, devWarn } from "@/lib/devLog";
import { generateClientId, isLooseUuid } from "@/lib/uuid";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { VerifiedScoutBadge } from "@/components/scout/VerifiedScoutBadge";
import { userMayMessagePlayers } from "@/lib/scoutVerification";
import { fetchVerifiedScoutFlagsForUserIds } from "@/lib/supabase/scoutVerificationPublic";
import {
  deleteMessageForCurrentUser,
  isMessageVisibleForUser,
} from "@/lib/messages/deleteMessage";

type Props = {
  otherUserId: string;
};

type UiThreadMessage = MessageRow & {
  pending?: boolean;
  clientTempId?: string;
};

function byCreatedAt(a: UiThreadMessage, b: UiThreadMessage): number {
  return (
    new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  );
}

/** Merge an INSERT event from Realtime into local state (dedupe + drop matching optimistic). */
function mergeRealtimeInsert(
  prev: UiThreadMessage[],
  row: MessageRow,
  me: string,
): UiThreadMessage[] {
  const incoming = row;
  if (prev.some((m) => m.id === incoming.id)) return prev;

  const filtered = prev.filter((m) => {
    if (!m.pending || m.sender_id !== incoming.sender_id || m.message !== incoming.message) {
      return true;
    }
    if (incoming.sender_id === me) return false;
    return true;
  });

  return [...filtered, incoming].sort(byCreatedAt);
}

function toMessageDebugRow(
  row: MessageRow,
  currentUserId: string,
): {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  deleted_for_sender: boolean;
  deleted_for_recipient: boolean;
  visibleForCurrentUser: boolean;
} {
  return {
    id: row.id,
    sender_id: row.sender_id,
    receiver_id: row.receiver_id,
    message: row.message,
    deleted_for_sender: row.deleted_for_sender,
    deleted_for_recipient: row.deleted_for_recipient,
    visibleForCurrentUser: isMessageVisibleForUser(row, currentUserId),
  };
}

export function ConversationView({ otherUserId }: Props) {
  const t = useTranslations("messages");
  const tSv = useTranslations("scoutVerification");
  const format = useFormatter();
  const scoutGate = useScoutVerification();
  const { showError, showSuccess } = useAppFeedback();
  const notificationsInbox = useNotificationsInboxOptional();

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState<string>("");
  const [messages, setMessages] = useState<UiThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** null = not subscribed yet; true = live; false = subscribe failed (use manual refresh). */
  const [realtimeOk, setRealtimeOk] = useState<boolean | null>(null);
  const [otherIsVerifiedScout, setOtherIsVerifiedScout] = useState(false);
  const [hidingMessageId, setHidingMessageId] = useState<string | null>(null);

  const validParam = isLooseUuid(otherUserId);

  const scrollToLatest = useCallback(() => {
    requestAnimationFrame(() => {
      const root = scrollRef.current;
      const end = endRef.current;
      if (root) {
        root.scrollTop = root.scrollHeight;
      }
      end?.scrollIntoView({ block: "end", behavior: "auto" });
    });
  }, []);

  const loadThread = useCallback(async () => {
    if (!validParam) {
      setLoading(false);
      setThreadError(null);
      setMessages([]);
      return;
    }

    setLoading(true);
    setThreadError(null);
    // Clear any stale local thread rows before fresh DB fetch.
    setMessages([]);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id ?? null;
      setCurrentUserId(me);

      if (!me) {
        setMessages([]);
        setLoading(false);
        return;
      }

      if (me === otherUserId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const names = await fetchDisplayNamesForUserIds(
        [otherUserId],
        t("unknownUser"),
      );
      const baseName = names.get(otherUserId) ?? t("unknownUser");
      setOtherName(baseName);

      const { rows, errorMessage } = await fetchConversationMessages(
        me,
        otherUserId,
      );
      const data = rows;

      if (errorMessage) {
        logFullSupabaseError(
          "[ConversationView] loadThread fetch failed",
          new Error(errorMessage),
          { otherUserId },
        );
        setThreadError(errorMessage);
        setMessages([]);
      } else {
        const latestIncoming = [...rows]
          .reverse()
          .find((row) => row.sender_id === otherUserId) ?? null;
        if (latestIncoming) {
          const teamLabel = await fetchOfficialAdminNoticeSenderLabelForLatestMessage(
            me,
            otherUserId,
            latestIncoming.message,
            latestIncoming.created_at,
          );
          if (teamLabel) {
            setOtherName(teamLabel);
          }
        }
        devLog("FETCH ROWS BEFORE FILTER", data);
        devTable(
          (data ?? []).map((row) => ({
            id: row.id,
            sender_id: row.sender_id,
            receiver_id: row.receiver_id,
            message: row.message,
            deleted_for_sender: row.deleted_for_sender,
            deleted_for_recipient: row.deleted_for_recipient,
          })),
        );
        devLog("FETCH ROWS BEFORE FILTER", {
          currentUserId: me,
          chatPartnerId: otherUserId,
          count: rows.length,
        });
        devTable(rows.map((row) => toMessageDebugRow(row, me)));
        const visible = rows.filter((message) => {
          const insertedIntoUI = isMessageVisibleForUser(message, me);
          devLog("CHAT SOURCE", {
            source: "initial fetch",
            messageId: message.id,
            sender_id: message.sender_id,
            receiver_id: message.receiver_id,
            deleted_for_sender: message.deleted_for_sender,
            deleted_for_recipient: message.deleted_for_recipient,
            insertedIntoUI,
          });
          return insertedIntoUI;
        });
        devLog("FETCH ROWS AFTER FILTER", {
          currentUserId: me,
          chatPartnerId: otherUserId,
          count: visible.length,
        });
        devLog("FETCH ROWS AFTER FILTER", visible);
        devTable(
          visible.map((row) => ({
            id: row.id,
            sender_id: row.sender_id ?? (row as { senderId?: string }).senderId,
            receiver_id:
              row.receiver_id ?? (row as { receiverId?: string }).receiverId,
            message: row.message,
            deleted_for_sender:
              row.deleted_for_sender ??
              (row as { deletedForSender?: boolean }).deletedForSender,
            deleted_for_recipient:
              row.deleted_for_recipient ??
              (row as { deletedForRecipient?: boolean }).deletedForRecipient,
          })),
        );
        devTable(visible.map((row) => toMessageDebugRow(row, me)));
        setMessages(visible);
      }
    } catch (e) {
      logFullSupabaseError("[ConversationView] loadThread", e);
      setThreadError(t("loadThreadError"));
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [otherUserId, t, validParam]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (!validParam || !currentUserId || currentUserId === otherUserId) {
      setOtherIsVerifiedScout(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const map = await fetchVerifiedScoutFlagsForUserIds([otherUserId]);
      if (!cancelled) setOtherIsVerifiedScout(map.get(otherUserId) ?? false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, otherUserId, validParam]);

  useEffect(() => {
    if (!validParam || !currentUserId || currentUserId === otherUserId) return;
    let cancelled = false;
    void (async () => {
      const res = await markThreadMessageNotificationsRead(
        supabase,
        currentUserId,
        otherUserId,
      );
      if (!res.ok) return;
      if (cancelled) return;
      await notificationsInbox?.refreshUnreadCount();
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, otherUserId, validParam, notificationsInbox]);

  const manualRefresh = useCallback(async () => {
    if (!currentUserId || currentUserId === otherUserId || !validParam) return;

    setRefreshError(null);
    setRefreshing(true);
    try {
      const { rows, errorMessage } = await fetchConversationMessages(
        currentUserId,
        otherUserId,
      );
      const data = rows;
      if (errorMessage) {
        logFullSupabaseError(
          "[ConversationView] manualRefresh fetch failed",
          new Error(errorMessage),
          { otherUserId },
        );
        setRefreshError(t("refreshFailed"));
      } else {
        setMessages((prev) => {
          const pending = prev.filter((m) => m.pending);
          devLog("FETCH ROWS BEFORE FILTER", data);
          devTable(
            (data ?? []).map((row) => ({
              id: row.id,
              sender_id: row.sender_id,
              receiver_id: row.receiver_id,
              message: row.message,
              deleted_for_sender: row.deleted_for_sender,
              deleted_for_recipient: row.deleted_for_recipient,
            })),
          );
          devLog("FETCH ROWS BEFORE FILTER", {
            currentUserId,
            chatPartnerId: otherUserId,
            count: rows.length,
          });
          devTable(rows.map((row) => toMessageDebugRow(row, currentUserId)));
          const live = rows.filter((message) => {
            const insertedIntoUI = isMessageVisibleForUser(message, currentUserId);
            devLog("CHAT SOURCE", {
              source: "refresh",
              messageId: message.id,
              sender_id: message.sender_id,
              receiver_id: message.receiver_id,
              deleted_for_sender: message.deleted_for_sender,
              deleted_for_recipient: message.deleted_for_recipient,
              insertedIntoUI,
            });
            return insertedIntoUI;
          });
          devLog("FETCH ROWS AFTER FILTER", {
            currentUserId,
            chatPartnerId: otherUserId,
            count: live.length,
          });
          devLog("FETCH ROWS AFTER FILTER", live);
          devTable(
            live.map((row) => ({
              id: row.id,
              sender_id: row.sender_id ?? (row as { senderId?: string }).senderId,
              receiver_id:
                row.receiver_id ?? (row as { receiverId?: string }).receiverId,
              message: row.message,
              deleted_for_sender:
                row.deleted_for_sender ??
                (row as { deletedForSender?: boolean }).deletedForSender,
              deleted_for_recipient:
                row.deleted_for_recipient ??
                (row as { deletedForRecipient?: boolean }).deletedForRecipient,
            })),
          );
          devTable(live.map((row) => toMessageDebugRow(row, currentUserId)));
          return [...live, ...pending].sort(byCreatedAt);
        });
      }
    } catch (e) {
      logFullSupabaseError("[ConversationView] manualRefresh unexpected", e, {
        otherUserId,
      });
      setRefreshError(t("loadThreadError"));
    } finally {
      setRefreshing(false);
    }
  }, [currentUserId, otherUserId, t, validParam]);

  useEffect(() => {
    if (!validParam || !currentUserId || currentUserId === otherUserId) {
      return;
    }

    const me = currentUserId;
    const them = otherUserId;

    setRealtimeOk(null);

    const channel = supabase
      .channel(`dm:${me}:${them}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          devLog("REALTIME MESSAGE RECEIVED", payload.new);
          devTable([
            {
              id: (payload.new as { id?: unknown } | null)?.id,
              sender_id: (payload.new as { sender_id?: unknown } | null)?.sender_id,
              receiver_id: (payload.new as { receiver_id?: unknown } | null)
                ?.receiver_id,
              message: (payload.new as { message?: unknown } | null)?.message,
              deleted_for_sender: (
                payload.new as { deleted_for_sender?: unknown } | null
              )?.deleted_for_sender,
              deleted_for_recipient: (
                payload.new as { deleted_for_recipient?: unknown } | null
              )?.deleted_for_recipient,
            },
          ]);
          const row = parseMessageRow(payload.new, "realtime messages INSERT");
          if (!row) return;
          if (!isMessageInConversation(row, me, them)) return;
          const incoming = row;
          devLog("REALTIME MESSAGE RECEIVED", {
            source: "realtime INSERT",
            messageId: incoming.id,
            sender_id: incoming.sender_id,
            receiver_id: incoming.receiver_id,
            deleted_for_sender: incoming.deleted_for_sender,
            deleted_for_recipient: incoming.deleted_for_recipient,
          });
          devTable([toMessageDebugRow(incoming, me)]);
          const insertedIntoUI = isMessageVisibleForUser(incoming, me);
          devLog("CHAT SOURCE", {
            source: "realtime",
            messageId: incoming.id,
            sender_id: incoming.sender_id,
            receiver_id: incoming.receiver_id,
            deleted_for_sender: incoming.deleted_for_sender,
            deleted_for_recipient: incoming.deleted_for_recipient,
            insertedIntoUI,
          });
          if (!insertedIntoUI) {
            devLog("REALTIME MESSAGE FILTERED OUT", { messageId: incoming.id });
            setMessages((prev) => prev.filter((m) => m.id !== incoming.id));
            return;
          }
          setMessages((prev) => mergeRealtimeInsert(prev, incoming, me));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          devLog("REALTIME MESSAGE RECEIVED", payload.new);
          devTable([
            {
              id: (payload.new as { id?: unknown } | null)?.id,
              sender_id: (payload.new as { sender_id?: unknown } | null)?.sender_id,
              receiver_id: (payload.new as { receiver_id?: unknown } | null)
                ?.receiver_id,
              message: (payload.new as { message?: unknown } | null)?.message,
              deleted_for_sender: (
                payload.new as { deleted_for_sender?: unknown } | null
              )?.deleted_for_sender,
              deleted_for_recipient: (
                payload.new as { deleted_for_recipient?: unknown } | null
              )?.deleted_for_recipient,
            },
          ]);
          const row = parseMessageRow(payload.new, "realtime messages UPDATE");
          if (!row) return;
          if (!isMessageInConversation(row, me, them)) return;
          const incoming = row;
          devLog("REALTIME MESSAGE RECEIVED", {
            source: "realtime UPDATE",
            messageId: incoming.id,
            sender_id: incoming.sender_id,
            receiver_id: incoming.receiver_id,
            deleted_for_sender: incoming.deleted_for_sender,
            deleted_for_recipient: incoming.deleted_for_recipient,
          });
          devTable([toMessageDebugRow(incoming, me)]);
          const insertedIntoUI = isMessageVisibleForUser(incoming, me);
          devLog("CHAT SOURCE", {
            source: "realtime",
            messageId: incoming.id,
            sender_id: incoming.sender_id,
            receiver_id: incoming.receiver_id,
            deleted_for_sender: incoming.deleted_for_sender,
            deleted_for_recipient: incoming.deleted_for_recipient,
            insertedIntoUI,
          });
          setMessages((prev) => {
            if (!insertedIntoUI) {
              devLog("REALTIME MESSAGE FILTERED OUT", { messageId: incoming.id });
              return prev.filter((m) => m.id !== incoming.id);
            }
            const next = prev.some((m) => m.id === incoming.id)
              ? prev.map((m) => (m.id === incoming.id ? { ...m, ...incoming } : m))
              : [...prev, incoming];
            return next.sort(byCreatedAt);
          });
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          setRealtimeOk(true);
          return;
        }
        // CLOSED is normal when leaving the page or removing the channel — do not treat as failure.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Realtime can transiently fail on flaky networks or tab wake-ups.
          // Keep UI on polling/manual refresh without noisy hard console errors.
          devWarn("[messages] realtime subscribe transient issue", {
            status,
            me,
            them,
            message:
              err && typeof err === "object" && "message" in err
                ? String((err as { message?: unknown }).message ?? "")
                : String(err ?? status),
          });
          setRealtimeOk(false);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [validParam, currentUserId, otherUserId]);

  useLayoutEffect(() => {
    scrollToLatest();
  }, [messages, scrollToLatest]);

  async function onSend() {
    if (!currentUserId || currentUserId === otherUserId || !validParam) return;
    if (scoutGate.loaded && scoutGate.isUnverifiedScout) {
      return;
    }

    const text = draft.trim();
    if (!text || sending) return;

    const clientTempId = generateClientId();
    const now = new Date().toISOString();
    const optimistic: UiThreadMessage = {
      id: `pending:${clientTempId}`,
      clientTempId,
      pending: true,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      message: text,
      created_at: now,
      deleted_for_sender: false,
      deleted_for_recipient: false,
    };

    setSendError(null);
    setDraft("");
    setMessages((prev) => [...prev, optimistic].sort(byCreatedAt));
    setSending(true);

    devLog("[PitchRusch][ConversationView] sendDirectMessage request", {
      senderId: currentUserId,
      receiverId: otherUserId,
      conversationPeerId: otherUserId,
      messageLength: text.length,
    });

    const result = await sendDirectMessage({
      senderId: currentUserId,
      receiverId: otherUserId,
      message: text,
    });

    setSending(false);

    if (!result.ok) {
      devLog("[PitchRusch][ConversationView] sendDirectMessage failed", {
        senderId: currentUserId,
        receiverId: otherUserId,
        ok: false,
        errorMessage: result.errorMessage,
      });
      if (result.errorMessage) {
        const expectedPolicyBlock = result.errorMessage.includes(
          "Messaging is currently unavailable for this account",
        );
        if (!expectedPolicyBlock) {
          logFullSupabaseError(
            "[ConversationView] sendDirectMessage",
            new Error(result.errorMessage),
            { otherUserId, senderId: currentUserId },
          );
        }
      }
      setMessages((prev) =>
        prev.filter((m) => m.clientTempId !== clientTempId),
      );
      setDraft(text);
      setSendError(result.errorMessage ?? t("failed"));
      return;
    }

    devLog("[PitchRusch][ConversationView] sendDirectMessage ok", {
      senderId: currentUserId,
      receiverId: otherUserId,
      insertedId: result.row.id,
    });

    setMessages((prev) => {
      if (prev.some((m) => m.id === result.row.id)) {
        return prev.filter((m) => m.clientTempId !== clientTempId);
      }
      return prev
        .map((m) =>
          m.clientTempId === clientTempId
            ? { ...result.row, pending: false }
            : m,
        )
        .sort(byCreatedAt);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSend();
    }
  }

  async function onHideMessage(m: UiThreadMessage) {
    if (!currentUserId || hidingMessageId || m.pending) return;
    if (m.id.startsWith("pending:")) return;

    const messageId = m.id;
    devLog("DELETE CLICK", {
      messageId,
      currentUserId,
      message: m,
    });
    devLog("DELETE SHAPE", {
      id: m?.id,
      sender_id: (m as Record<string, unknown>)?.sender_id,
      receiver_id: (m as Record<string, unknown>)?.receiver_id,
      senderId: (m as Record<string, unknown>)?.senderId,
      receiverId: (m as Record<string, unknown>)?.receiverId,
    });
    devLog("DELETE CHECK", {
      currentUserId,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
    });

    setMessages((prev) =>
      prev.filter((item) => item.id !== m.id),
    );
    setHidingMessageId(messageId);
    try {
      try {
        await deleteMessageForCurrentUser(m, currentUserId, supabase);
      } catch (err) {
        console.error("[PitchRusch][ConversationView] deleteMessage failed", err);
        // Roll back optimistic hide if persistence failed.
        setMessages((prev) => [...prev, m].sort(byCreatedAt));
        await markThreadMessageNotificationsRead(supabase, currentUserId, otherUserId);
        await notificationsInbox?.refreshUnreadCount();
        showError(t("deleteMessageFailed"));
        return;
      }
      await markThreadMessageNotificationsRead(supabase, currentUserId, otherUserId);
      await notificationsInbox?.refreshUnreadCount();
      showSuccess(t("messageDeleted"));
    } finally {
      setHidingMessageId(null);
    }
  }

  if (!validParam) {
    return (
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-8 text-center text-sm text-gn-text-secondary">
        {t("invalidConversation")}
        <div className="mt-4">
          <Link
            href="/notifications"
            className="text-sm font-medium text-gn-accent hover:underline"
          >
            {t("backToInbox")}
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-gn-text-secondary">
        <Spinner />
        {t("loadingThread")}
      </div>
    );
  }

  if (currentUserId === otherUserId) {
    return (
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-8 text-center text-sm text-gn-text-secondary">
        {t("cannotMessageSelf")}
        <div className="mt-4">
          <Link
            href="/notifications"
            className="text-sm font-medium text-gn-accent hover:underline"
          >
            {t("backToInbox")}
          </Link>
        </div>
      </div>
    );
  }

  if (threadError) {
    return (
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-8 text-center">
        <p className="text-sm text-gn-text-secondary">{t("loadThreadError")}</p>
        <button
          type="button"
          onClick={() => void loadThread()}
          className="mt-4 rounded-xl bg-gn-accent px-4 py-2 text-sm font-medium text-gn-bg"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const trimmedDraft = draft.trim();
  const scoutMaySend =
    !scoutGate.loaded ||
    !scoutGate.row ||
    userMayMessagePlayers(scoutGate.row);

  const canSend =
    Boolean(trimmedDraft) &&
    !sending &&
    Boolean(currentUserId) &&
    currentUserId !== otherUserId &&
    scoutMaySend;

  const visibleMessages = currentUserId
    ? messages.filter((m) => isMessageVisibleForUser(m, currentUserId))
    : messages;

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-clip">
      <div className="mb-3 flex min-w-0 max-w-full flex-wrap items-center gap-2 border-b border-gn-border-subtle pb-3">
        <Link
          href="/notifications"
          className="shrink-0 text-sm font-medium text-gn-accent hover:underline"
        >
          ← {t("backToInbox")}
        </Link>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h1 className="min-w-0 truncate text-lg font-semibold text-gn-text">
            {otherName}
          </h1>
          {otherIsVerifiedScout ? (
            <VerifiedScoutBadge className="shrink-0" />
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void manualRefresh()}
          disabled={refreshing || sending}
          className="shrink-0 rounded-lg border border-gn-border-subtle px-3 py-1.5 text-xs font-medium text-gn-text-secondary transition-colors hover:border-gn-border hover:text-gn-text disabled:opacity-50"
        >
          {refreshing ? t("refreshing") : t("refreshMessages")}
        </button>
      </div>

      {realtimeOk === false ? (
        <p
          role="status"
          className="mb-2 rounded-lg border border-gn-border-subtle bg-gn-surface/40 px-3 py-2 text-xs text-gn-text-secondary"
        >
          {t("liveDisconnected")}
        </p>
      ) : null}

      {refreshError ? (
        <p role="alert" className="mb-2 text-xs text-gn-accent">
          {t("refreshFailed")}
        </p>
      ) : null}

      <div
        ref={scrollRef}
        className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-2 overflow-x-clip overflow-y-auto overscroll-y-contain pb-4"
      >
        {visibleMessages.length === 0 ? (
          <p className="py-8 text-center text-sm text-gn-text-tertiary">
            {t("threadEmpty")}
          </p>
        ) : (
          visibleMessages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.clientTempId ?? m.id}
                className={`flex w-full min-w-0 max-w-full ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[min(85%,20rem)] min-w-0 rounded-2xl px-3.5 py-2 text-sm ${
                    mine
                      ? `bg-gn-accent/25 text-gn-text border ${
                          m.pending
                            ? "border-gn-accent/20 opacity-80"
                            : "border-gn-accent/35"
                        }`
                      : "bg-gn-surface-elevated text-gn-text border border-gn-border-subtle"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {m.message}
                  </p>
                  <div
                    className={`mt-1 flex items-center gap-2 ${!m.pending ? "justify-between" : ""}`}
                  >
                    <time
                      className="block text-[10px] text-gn-text-tertiary"
                        dateTime={m.created_at}
                    >
                      {m.pending
                        ? t("sending")
                        : format.dateTime(new Date(m.created_at ?? Date.now()), {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                    </time>
                    {!m.pending ? (
                      <button
                        type="button"
                        disabled={hidingMessageId === m.id}
                        onClick={() => void onHideMessage(m)}
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-gn-text-tertiary transition-colors hover:bg-black/15 hover:text-gn-accent disabled:opacity-50"
                        aria-label={t("deleteMessage")}
                      >
                        {hidingMessageId === m.id
                          ? t("deletingMessage")
                          : t("deleteMessage")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} className="h-px w-full shrink-0" aria-hidden />
      </div>

      <div className="shrink-0 border-t border-gn-border-subtle bg-gn-bg pt-3">
        {scoutGate.loaded && scoutGate.isUnverifiedScout ? (
          <p className="mb-2 rounded-xl border border-gn-border-subtle bg-gn-surface/40 px-3 py-3 text-sm text-gn-text-secondary">
            {tSv("messagingComposerLocked")}
            <Link
              href="/scout-apply"
              className="ms-1 font-medium text-gn-accent hover:underline"
            >
              {tSv("applyCta")}
            </Link>
          </p>
        ) : null}
        {sendError ? (
          <p role="alert" className="mb-2 text-xs text-gn-accent">
            {sendError}
          </p>
        ) : null}
        <div className="flex min-w-0 max-w-full gap-2">
          <input
            suppressHydrationWarning
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("messagePlaceholder")}
            className="min-w-0 max-w-full flex-1 rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-3 py-2.5 text-sm text-gn-text placeholder:text-gn-text-tertiary focus:border-gn-accent focus:outline-none focus:ring-1 focus:ring-gn-accent/40"
            disabled={
              sending ||
              !currentUserId ||
              (scoutGate.loaded && scoutGate.isUnverifiedScout)
            }
            autoComplete="off"
            aria-label={t("messagePlaceholder")}
          />
          <button
            type="button"
            onClick={() => void onSend()}
            disabled={!canSend}
            aria-busy={sending}
            className="shrink-0 rounded-xl bg-gn-accent px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:bg-gn-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? t("sending") : t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-gn-accent"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
      />
    </svg>
  );
}
