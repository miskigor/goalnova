"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useAppFeedback } from "@/components/feedback/FeedbackProvider";
import { hasPersistedSupabaseSession } from "@/lib/auth/hasPersistedSupabaseSession";
import { fetchDisplayNamesForUserIds } from "@/lib/supabase/messages";
import { supabase } from "@/lib/supabase/client";

const LOCALE_PREFIX_RE =
  /^\/(en|hr|de|bs|es|pt|sr|fr|it|nl|tr|ar)(?=\/)/;

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

/** Toast when a new DM arrives (notifications row or messages insert). */
export function IncomingMessageAlert() {
  const pathname = usePathname();
  const t = useTranslations("notifications");
  const tMessages = useTranslations("messages");
  const { showSuccess } = useAppFeedback();
  const pathnameRef = useRef(pathname);
  const lastToastAtRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!hasPersistedSupabaseSession()) return;

    let cancelled = false;
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const shouldSkip = (senderId: string) => {
      const path = pathnameRef.current;
      if (senderIdFromPathname(path) === senderId) return true;
      if (isOnNotificationsInbox(path)) return true;
      return false;
    };

    const notify = async (senderId: string, preview: string) => {
      const trimmedSender = senderId.trim();
      if (!trimmedSender || shouldSkip(trimmedSender)) return;

      const now = Date.now();
      const last = lastToastAtRef.current.get(trimmedSender) ?? 0;
      if (now - last < 2500) return;
      lastToastAtRef.current.set(trimmedSender, now);

      const names = await fetchDisplayNamesForUserIds(
        [trimmedSender],
        tMessages("unknownUser"),
      );
      if (cancelled) return;

      const senderName = names.get(trimmedSender) ?? tMessages("unknownUser");
      const body = preview.trim();
      const text =
        body.length > 0
          ? `${senderName}: ${body.length > 100 ? `${body.slice(0, 100)}…` : body}`
          : `${senderName} — ${t("newMessage")}`;
      showSuccess(text, { durationMs: 4500 });
    };

    const attach = (uid: string) => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }

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
            const row = payload.new as Record<string, unknown>;
            const senderId =
              typeof row.sender_id === "string" ? row.sender_id : "";
            const preview =
              typeof row.message === "string" ? row.message : "";
            void notify(senderId, preview);
          },
        )
        .subscribe();
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      userId = data.session?.user?.id ?? null;
      if (!userId) return;
      attach(userId);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const uid = session?.user?.id ?? null;
      if (uid === userId) return;
      userId = uid;
      if (!uid) {
        if (channel) {
          void supabase.removeChannel(channel);
          channel = null;
        }
        return;
      }
      attach(uid);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [showSuccess, t, tMessages]);

  return null;
}
