"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { usePathname } from "@/i18n/navigation";
import { IncomingMessageAlert } from "@/components/notifications/IncomingMessageAlert";
import { IncomingMessageAlertBoundary } from "@/components/notifications/IncomingMessageAlertBoundary";
import { devWarn } from "@/lib/devLog";
import { fetchUnreadMessageThreadCount } from "@/lib/supabase/messages";
import {
  logNotificationsRealtimeStatus,
  NOTIFICATIONS_BADGE_REFRESH_MS,
  NOTIFICATIONS_UNREAD_POLL_MS,
} from "@/lib/notifications/realtimeChannelUtils";
import { hasPersistedSupabaseSession } from "@/lib/auth/hasPersistedSupabaseSession";
import {
  readGateSessionSnapshot,
  readSyncGateSessionSnapshot,
} from "@/lib/auth/gateSessionSnapshot";
import { supabase } from "@/lib/supabase/client";
import {
  isLikelyTransientNetworkFailure,
  logFullSupabaseError,
} from "@/lib/supabase/logError";

type NotificationsInboxContextValue = {
  /** Distinct DM peers with unread `message` / `admin_notice` notification rows. */
  unreadCount: number;
  realtimeHealthy: boolean;
  refreshUnreadCount: () => Promise<void>;
};

const NotificationsInboxContext = createContext<
  NotificationsInboxContextValue | undefined
>(undefined);

const CHANNEL = "pitchrusch-combined-inbox-unread";

const UNHEALTHY_STATUSES = new Set([
  "CHANNEL_ERROR",
  "TIMED_OUT",
  "CLOSED",
]);

export function NotificationsInboxProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [realtimeHealthy, setRealtimeHealthy] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    const uid = userIdRef.current?.trim() ?? "";
    if (!uid) {
      setUnreadCount(0);
      return;
    }
    try {
      const unreadDmRes = await supabase
        .from("notifications")
        .select("related_user_id")
        .eq("user_id", uid)
        .eq("is_read", false)
        .in("type", ["message", "admin_notice"]);
      const dmRows = unreadDmRes.data ?? [];
      const dmPeers = new Set(
        dmRows
          .map((r) =>
            typeof r.related_user_id === "string" ? r.related_user_id.trim() : "",
          )
          .filter(Boolean),
      );
      const { count: messageThreadUnread } = await fetchUnreadMessageThreadCount(uid);
      const notificationPeers = unreadDmRes.error ? 0 : dmPeers.size;

      if (unreadDmRes.error) {
        if (isLikelyTransientNetworkFailure(unreadDmRes.error)) {
          devWarn("[notifications inbox] unread count refresh skipped (network)", unreadDmRes.error);
          if (messageThreadUnread > 0) {
            setUnreadCount(messageThreadUnread);
          }
          return;
        }
        logFullSupabaseError("[notifications inbox] unread dm peers fetch failed", unreadDmRes.error, {
          uid,
        });
        setUnreadCount(messageThreadUnread);
        return;
      }

      if (notificationPeers > 0) {
        setUnreadCount(notificationPeers);
        return;
      }

      if (messageThreadUnread === 0) {
        setUnreadCount(0);
        return;
      }

      // Unread notifications cleared — do not keep badge from "latest incoming message"
      // thread heuristic. Only use threads when DM notification rows never existed (trigger off).
      const { count: dmNotificationHistory, error: historyError } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .in("type", ["message", "admin_notice"]);

      if (historyError) {
        logFullSupabaseError("[notifications inbox] dm notification history count failed", historyError, {
          uid,
        });
        setUnreadCount(0);
        return;
      }

      setUnreadCount((dmNotificationHistory ?? 0) === 0 ? messageThreadUnread : 0);
    } catch (err) {
      if (isLikelyTransientNetworkFailure(err)) {
        devWarn("[notifications inbox] refreshUnreadCount skipped (network)", err);
        return;
      }
      logFullSupabaseError("[notifications inbox] refreshUnreadCount unexpected", err, { uid });
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    if (!userIdRef.current) return;
    void refreshUnreadCount();
  }, [pathname, refreshUnreadCount]);

  useEffect(() => {
    if (realtimeHealthy) return;
    const uid = userIdRef.current;
    if (!uid) return;
    void refreshUnreadCount();
    const id = setInterval(() => void refreshUnreadCount(), NOTIFICATIONS_UNREAD_POLL_MS);
    return () => clearInterval(id);
  }, [realtimeHealthy, refreshUnreadCount]);

  useEffect(() => {
    if (!hasPersistedSupabaseSession()) {
      userIdRef.current = null;
      setUnreadCount(0);
      setRealtimeHealthy(true);
      return;
    }

    let cancelled = false;
    const channelRef = { current: null as ReturnType<typeof supabase.channel> | null };
    let attachGen = 0;
    const subscribedUserIdRef = { current: null as string | null };

    const teardownChannel = () => {
      subscribedUserIdRef.current = null;
      const ch = channelRef.current;
      if (ch) {
        void supabase.removeChannel(ch);
        channelRef.current = null;
      }
    };

    const attachChannel = (userId: string) => {
      if (channelRef.current && subscribedUserIdRef.current === userId) {
        return;
      }
      attachGen += 1;
      const gen = attachGen;
      teardownChannel();

      const ch = supabase
        .channel(`${CHANNEL}:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void refreshUnreadCount();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${userId}`,
          },
          () => {
            void refreshUnreadCount();
          },
        )
        .subscribe((status, err) => {
          if (cancelled || gen !== attachGen) return;
          if (status === "SUBSCRIBED") {
            subscribedUserIdRef.current = userId;
            setRealtimeHealthy(true);
            return;
          }
          if (!UNHEALTHY_STATUSES.has(status)) return;

          subscribedUserIdRef.current = null;
          setRealtimeHealthy(false);
          logNotificationsRealtimeStatus("inbox", status, err);
          queueMicrotask(() => {
            if (cancelled || gen !== attachGen) return;
            if (channelRef.current === ch) {
              void supabase.removeChannel(ch);
              channelRef.current = null;
            }
          });
          void refreshUnreadCount();
        });

      channelRef.current = ch;
    };

    const syncUserId = async (uid: string | null) => {
      userIdRef.current = uid;
      if (!uid) {
        attachGen += 1;
        teardownChannel();
        setUnreadCount(0);
        setRealtimeHealthy(true);
        return;
      }
      await refreshUnreadCount();
      if (cancelled) return;
      attachChannel(uid);
    };

    const resolveUserId = async (
      session?: Session | null,
    ): Promise<string | null> => {
      const fromSession = session?.user?.id?.trim();
      if (fromSession) return fromSession;
      const snapshot = await readGateSessionSnapshot("NotificationsInboxProvider");
      return snapshot.user?.id ?? snapshot.session?.user?.id ?? null;
    };

    const bootSnapshot = readSyncGateSessionSnapshot();
    void resolveUserId(bootSnapshot.session).then((uid) => {
      if (cancelled) return;
      void syncUserId(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      void resolveUserId(session).then((uid) => {
        if (cancelled) return;
        void syncUserId(uid);
      });
    });

    const badgePollId = window.setInterval(() => {
      if (!userIdRef.current) return;
      void refreshUnreadCount();
    }, NOTIFICATIONS_BADGE_REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState !== "visible" || !userIdRef.current) return;
      void refreshUnreadCount();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      attachGen += 1;
      window.clearInterval(badgePollId);
      document.removeEventListener("visibilitychange", onVisible);
      sub.subscription.unsubscribe();
      teardownChannel();
    };
  }, [refreshUnreadCount]);

  const value = useMemo(
    () => ({
      unreadCount,
      realtimeHealthy,
      refreshUnreadCount,
    }),
    [unreadCount, realtimeHealthy, refreshUnreadCount],
  );

  return (
    <NotificationsInboxContext.Provider value={value}>
      {children}
      <IncomingMessageAlertBoundary>
        <IncomingMessageAlert />
      </IncomingMessageAlertBoundary>
    </NotificationsInboxContext.Provider>
  );
}

/** Avoid hard-crashing the whole `[locale]` tree if a component mounts outside the provider (shell edge cases). */
const NOTIFICATIONS_INBOX_FALLBACK: NotificationsInboxContextValue = {
  unreadCount: 0,
  realtimeHealthy: true,
  refreshUnreadCount: async () => {},
};

export function useNotificationsInbox(): NotificationsInboxContextValue {
  const ctx = useContext(NotificationsInboxContext);
  if (ctx) return ctx;
  devWarn(
    "[notifications] useNotificationsInbox outside NotificationsInboxProvider — using fallback (badge disabled).",
  );
  return NOTIFICATIONS_INBOX_FALLBACK;
}

export function useNotificationsInboxOptional(): NotificationsInboxContextValue | null {
  return useContext(NotificationsInboxContext) ?? null;
}
