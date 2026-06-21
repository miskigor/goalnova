"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import {
  buildInboxSummaries,
  type ConversationSummary,
} from "@/lib/supabase/messages";
import { localizedDirectMessageBody } from "@/lib/messages/welcomeInboxMessage";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { VerifiedScoutBadge } from "@/components/scout/VerifiedScoutBadge";
import { useNotificationsInboxOptional } from "@/components/notifications/NotificationsInboxContext";
import {
  markAllNotificationsRead,
  markAllUnreadMessageNotificationsRead,
} from "@/lib/supabase/notifications";

function formatInboxTime(
  format: ReturnType<typeof useFormatter>,
  iso: string | null | undefined,
): string {
  const raw = iso?.trim() ?? "";
  if (!raw) return "";
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return "";
  try {
    return format.dateTime(new Date(ms), {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

function ScoutInboxNotice() {
  const tSv = useTranslations("scoutVerification");
  const scoutGate = useScoutVerification();
  if (!scoutGate.loaded || !scoutGate.isUnverifiedScout) {
    return null;
  }
  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-3 text-sm text-gn-text-secondary max-lg:px-2 max-lg:py-1.5"
    >
      {tSv("inboxScoutNotice")}
      <Link
        href="/scout-apply"
        className="relative z-10 ms-1 inline touch-manipulation font-medium text-gn-accent hover:underline"
      >
        {tSv("applyCta")}
      </Link>
    </div>
  );
}

export function MessagesInboxView() {
  const t = useTranslations("messages");
  const format = useFormatter();
  const inbox = useNotificationsInboxOptional();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setConversations([]);
        setError(null);
        setLoading(false);
        return;
      }

      const { conversations: list, errorMessage } = await buildInboxSummaries(
        uid,
        t("unknownUser"),
      );

      if (errorMessage) {
        logFullSupabaseError(
          "[PitchRusch messages] inbox summaries",
          new Error(errorMessage),
        );
        setError("load_failed");
        setConversations([]);
      } else {
        setConversations(list);
        setError(null);
        const markedAllNotifications = await markAllNotificationsRead(supabase, uid);
        if (!markedAllNotifications.ok) {
          logFullSupabaseError(
            "[PitchRusch messages] markAllNotificationsRead",
            new Error(markedAllNotifications.error.message?.trim() || "mark all notifications read failed"),
            { uid, error: markedAllNotifications.error },
          );
        }
        const cleared = await markAllUnreadMessageNotificationsRead(
          supabase,
          uid,
        );
        if (!cleared.ok) {
          logFullSupabaseError(
            "[PitchRusch messages] markAllUnreadMessageNotificationsRead",
            new Error(cleared.error.message?.trim() || "mark read failed"),
            { uid, error: cleared.error },
          );
        }
        void inbox?.refreshUnreadCount();
      }
    } catch {
      setError(t("loadInboxError"));
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [t, inbox]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void inbox?.refreshUnreadCount();
  }, [inbox]);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] min-w-0 max-w-full flex-col items-center justify-center gap-2 text-sm text-gn-text-secondary">
        <Spinner />
        {t("loadingInbox")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-w-0 max-w-full space-y-4 max-lg:space-y-2">
        <ScoutInboxNotice />
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-8 text-center max-lg:rounded-xl max-lg:px-2 max-lg:py-4">
        <p className="text-sm text-gn-text-secondary">{t("loadInboxError")}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-xl bg-gn-accent px-4 py-2.5 text-xs font-semibold text-black hover:bg-gn-accent-hover max-lg:px-2 max-lg:py-1.5"
        >
          {t("retry")}
        </button>
      </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="min-w-0 max-w-full space-y-4 max-lg:space-y-2">
        <ScoutInboxNotice />
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-14 text-center max-lg:rounded-xl max-lg:px-2 max-lg:py-6">
        <p className="text-sm font-medium text-gn-text">{t("emptyTitle")}</p>
        <p className="mt-2 text-sm text-gn-text-secondary">
          {t("emptySubtitle")}
        </p>
        <Link
          href="/discover"
          className={`${GN_PRIMARY_BUTTON_CLASS} mt-6 inline-flex w-full max-w-xs justify-center text-xs max-lg:mt-4 max-lg:py-1.5`}
        >
          {t("explorePlayersCta")}
        </Link>
      </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 max-lg:space-y-2">
      <ScoutInboxNotice />
      <ul className="flex min-w-0 flex-col gap-1">
      {conversations.map((c) => (
        <li key={c.otherUserId}>
          <Link
            href={`/messages/${c.otherUserId}`}
            className="block min-w-0 max-w-full overflow-x-clip rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-3 transition-[border-color,background-color,box-shadow] duration-300 ease-gn-smooth motion-reduce:transition-colors hover:border-white/[0.1] hover:bg-gn-surface-elevated/60 hover:shadow-[0_10px_36px_-16px_rgba(0,0,0,0.45)] max-lg:px-2 max-lg:py-1.5"
          >
            <div className="flex items-start justify-between gap-3 max-lg:gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-gn-text">
                    {c.displayName}
                  </p>
                  {c.otherIsVerifiedScout ? (
                    <VerifiedScoutBadge withTooltip={false} className="shrink-0" />
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-sm text-gn-text-secondary">
                  {(() => {
                    const body = localizedDirectMessageBody(c.lastMessage, t);
                    return body.length > 140 ? `${body.slice(0, 140)}…` : body;
                  })()}
                </p>
              </div>
              <time
                className="shrink-0 text-xs text-gn-text-tertiary"
                dateTime={c.lastAt || undefined}
              >
                {formatInboxTime(format, c.lastAt)}
              </time>
            </div>
          </Link>
        </li>
      ))}
    </ul>
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
