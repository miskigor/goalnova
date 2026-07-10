"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useAppFeedback } from "@/components/feedback/feedbackContext";
import { useNotificationsInboxOptional } from "@/components/notifications/NotificationsInboxContext";
import { NOTIFICATIONS_UNREAD_POLL_MS } from "@/lib/notifications/realtimeChannelUtils";
import { fetchDisplayNamesForUserIds } from "@/lib/supabase/messages";
import { supabase } from "@/lib/supabase/client";

const LOCALE_PREFIX_RE =
  /^\/(en|hr|de|bs|es|pt|sr|fr|it|nl|tr|ar)(?=\/)/;

const DM_POLL_MS = 8_000;

function senderIdFromPathname(pathname: string): string | null {
  const normalized = pathname.replace(LOCALE_PREFIX_RE, "");
  const match = normalized.match(/^\/messages\/([^/?#]+)/);
  return match?.[1]?.trim() || null;
}

function isOnNotificationsInbox(pathname: string): boolean {
  const normalized = pathname.replace(LOCALE_PREFIX_RE, "");
  return (
    normalized === "/notifications" ||
    normalized.startsWith("/notifications/")
  );
}

/** Toast when a new DM arrives (Realtime + polling fallback). */
export function IncomingMessageAlert() {
  const pathname = usePathname();
  const t = useTranslations("notifications");
  const tMessages = useTranslations("messages");
  const { showSuccess } = useAppFeedback();
  const inbox = useNotificationsInboxOptional();
  const pathnameRef = useRef(pathname);
  const lastToastAtRef = useRef<Map<string, number>>(new Map());
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const showSuccessRef = useRef(showSuccess);
  const inboxRef = useRef(inbox);
  const tRef = useRef(t);
  const tMessagesRef = useRef(tMessages);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    showSuccessRef.current = showSuccess;
    inboxRef.current = inbox;
    tRef.current = t;
    tMessagesRef.current = tMessages;
  }, [showSuccess, inbox, t, tMessages]);

  useEffect(() => {
    let cancelled = false;
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const shouldSkip = (senderId: string) => {
      const path = pathnameRef.current;
      if (senderIdFromPathname(path) === senderId) return true;
      if (isOnNotificationsInbox(path)) return true;
      return false;
    };

    const notify = async (senderId: string, preview: string, messageId?: string) => {
      const trimmedSender = senderId.trim();
      if (!trimmedSender || shouldSkip(trimmedSender)) return;

      if (messageId) {
        if (seenMessageIdsRef.current.has(messageId)) return;
        seenMessageIdsRef.current.add(messageId);
      }

      const now = Date.now();
      const last = lastToastAtRef.current.get(trimmedSender) ?? 0;
      if (now - last < 2500) return;
      lastToastAtRef.current.set(trimmedSender, now);

      void inboxRef.current?.refreshUnreadCount();

      const names = await fetchDisplayNamesForUserIds(
        [trimmedSender],
        tMessagesRef.current("unknownUser"),
      );
      if (cancelled) return;

      const senderName = names.get(trimmedSender) ?? tMessagesRef.current("unknownUser");
      const body = preview.trim();
      const text =
        body.length > 0
          ? `${senderName}: ${body.length > 100 ? `${body.slice(0, 100)}…` : body}`
          : `${senderName} — ${tRef.current("newMessage")}`;
      showSuccessRef.current(text, { durationMs: 4500 });
    };

    const handleMessageRow = (row: Record<string, unknown>) => {
      const senderId = typeof row.sender_id === "string" ? row.sender_id : "";
      const preview = typeof row.message === "string" ? row.message : "";
      const messageId = typeof row.id === "string" ? row.id : undefined;
      void notify(senderId, preview, messageId);
    };

    const handleNotificationRow = (row: Record<string, unknown>) => {
      if (row.type !== "message") return;
      const senderId =
        typeof row.related_user_id === "string" ? row.related_user_id : "";
      const preview = typeof row.message === "string" ? row.message : "";
      void notify(senderId, preview);
    };

    const seedSeenMessages = async (uid: string) => {
      const { data } = await supabase
        .from("messages")
        .select("id")
        .eq("receiver_id", uid)
        .order("created_at", { ascending: false })
        .limit(40);
      if (cancelled || !data) return;
      for (const row of data) {
        if (typeof row.id === "string") seenMessageIdsRef.current.add(row.id);
      }
    };

    const pollLatestIncoming = async (uid: string) => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, message, created_at")
        .eq("receiver_id", uid)
        .order("created_at", { ascending: false })
        .limit(5);
      if (cancelled || !data) return;
      for (const row of data) {
        if (typeof row.id !== "string" || seenMessageIdsRef.current.has(row.id)) {
          continue;
        }
        handleMessageRow(row as Record<string, unknown>);
      }
      void inboxRef.current?.refreshUnreadCount();
    };

    const attach = (uid: string) => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }

      void seedSeenMessages(uid);

      channel = supabase
        .channel(`incoming-dm-alert:${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${uid}`,
          },
          (payload) => {
            handleMessageRow(payload.new as Record<string, unknown>);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            handleNotificationRow(payload.new as Record<string, unknown>);
          },
        )
        .subscribe();

      pollTimer = setInterval(() => {
        void pollLatestIncoming(uid);
      }, DM_POLL_MS);
    };

    const sync = (uid: string | null) => {
      if (uid === userId) return;
      userId = uid;
      if (!uid) {
        if (channel) {
          void supabase.removeChannel(channel);
          channel = null;
        }
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        seenMessageIdsRef.current.clear();
        return;
      }
      attach(uid);
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      sync(data.session?.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      sync(session?.user?.id ?? null);
    });

    const onVisible = () => {
      if (document.visibilityState !== "visible" || !userId) return;
      void pollLatestIncoming(userId);
      void inboxRef.current?.refreshUnreadCount();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      if (pollTimer) clearInterval(pollTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const inbox = inboxRef.current;
    if (!inbox || inbox.realtimeHealthy) return;
    const id = setInterval(() => {
      void inboxRef.current?.refreshUnreadCount();
    }, NOTIFICATIONS_UNREAD_POLL_MS);
    return () => clearInterval(id);
  }, [inbox?.realtimeHealthy]);

  return null;
}
