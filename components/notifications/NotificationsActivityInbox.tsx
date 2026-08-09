"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  deleteNotificationForUser,
  fetchNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/lib/supabase/notifications";
import {
  localizedNotificationMessage,
  localizedNotificationTypeLabel,
} from "@/lib/notifications/notificationDisplay";
import { hrefForNotification } from "@/lib/notifications/notificationHref";
import { GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { useNotificationsInboxOptional } from "@/components/notifications/NotificationsInboxContext";

function formatWhen(
  format: ReturnType<typeof useFormatter>,
  iso: string | null | undefined,
): string {
  const raw = iso?.trim() ?? "";
  if (!raw) return "";
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return "";
  try {
    return format.dateTime(new Date(ms), { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

export function NotificationsActivityInbox() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const inbox = useNotificationsInboxOptional();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setRows([]);
        setError("guest");
        return;
      }
      const { rows: list, error: fetchError } = await fetchNotificationsForUser(supabase, uid);
      if (fetchError) {
        setError("load");
        setRows([]);
        return;
      }
      // Activity feed: hide pure DM rows (those live under Messages tab).
      setRows(list.filter((n) => n.type !== "message" && n.type !== "admin_notice"));
    } catch {
      setError("load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onMarkAll() {
    setMarkingAll(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      await markAllNotificationsRead(supabase, uid);
      setRows((prev) => prev.map((r) => ({ ...r, is_read: true })));
      void inbox?.refreshUnreadCount();
    } finally {
      setMarkingAll(false);
    }
  }

  async function onMarkRead(id: string) {
    setBusyId(id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      await markNotificationRead(supabase, uid, id);
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)),
      );
      void inbox?.refreshUnreadCount();
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string) {
    setBusyId(id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      await deleteNotificationForUser(supabase, uid, id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      void inbox?.refreshUnreadCount();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-gn-text-secondary" role="status">
        {t("loading")}
      </p>
    );
  }

  if (error === "guest") {
    return (
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-6 text-center">
        <p className="text-sm font-medium text-gn-text">{t("guestEmptyTitle")}</p>
        <Link href="/login" className="mt-3 inline-block text-sm font-semibold text-gn-accent">
          {t("retry")}
        </Link>
      </div>
    );
  }

  if (error === "load") {
    return (
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-6 text-center">
        <p className="text-sm text-gn-text">{t("loadError")}</p>
        <p className="mt-1 text-xs text-gn-text-secondary">{t("loadErrorDetail")}</p>
        <button
          type="button"
          onClick={() => void load()}
          className={`${GN_SECONDARY_BUTTON_CLASS} mt-4`}
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-8 text-center">
        <p className="text-base font-semibold text-gn-text">{t("emptyTitle")}</p>
        <p className="mt-1 text-sm text-gn-text-secondary">{t("emptySubtitle")}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/explore" className={`${GN_SECONDARY_BUTTON_CLASS} text-sm`}>
            {t("explorePlayersCta")}
          </Link>
          <Link href="/upload" className={`${GN_SECONDARY_BUTTON_CLASS} text-sm`}>
            {t("uploadVideoCta")}
          </Link>
        </div>
      </div>
    );
  }

  const unread = rows.filter((r) => !r.is_read).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gn-text-secondary">
          {unread > 0 ? t("unreadCount", { count: unread }) : t("allReadHint")}
        </p>
        {unread > 0 ? (
          <button
            type="button"
            disabled={markingAll}
            onClick={() => void onMarkAll()}
            className="text-xs font-semibold text-gn-accent hover:underline disabled:opacity-50"
          >
            {markingAll ? t("markingAll") : t("markAllRead")}
          </button>
        ) : null}
      </div>

      <ul className="space-y-2">
        {rows.map((n) => {
          const href = hrefForNotification(n);
          const message = localizedNotificationMessage(n, t);
          const typeLabel = localizedNotificationTypeLabel(n.type, t);
          const when = formatWhen(format, n.created_at);
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full bg-[#FF8A00]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF8A00]">
                  {typeLabel}
                </span>
                {when ? (
                  <time className="shrink-0 text-[11px] text-gn-text-tertiary">{when}</time>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-snug text-gn-text">{message}</p>
            </>
          );

          return (
            <li key={n.id}>
              <article
                className={[
                  "rounded-2xl border px-3.5 py-3",
                  n.is_read
                    ? "border-gn-border-subtle bg-gn-surface/25"
                    : "border-[#FF8A00]/35 bg-[#FF8A00]/8",
                ].join(" ")}
              >
                {href ? (
                  <Link
                    href={href}
                    className="block"
                    onClick={() => {
                      if (!n.is_read) void onMarkRead(n.id);
                    }}
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
                <div className="mt-2.5 flex flex-wrap gap-3">
                  {!n.is_read ? (
                    <button
                      type="button"
                      disabled={busyId === n.id}
                      onClick={() => void onMarkRead(n.id)}
                      className="text-[11px] font-medium text-gn-accent hover:underline disabled:opacity-50"
                    >
                      {busyId === n.id ? t("marking") : t("markRead")}
                    </button>
                  ) : (
                    <span className="text-[11px] text-gn-text-tertiary">{t("stateRead")}</span>
                  )}
                  <button
                    type="button"
                    disabled={busyId === n.id}
                    onClick={() => void onDelete(n.id)}
                    className="text-[11px] font-medium text-gn-text-tertiary hover:text-gn-text disabled:opacity-50"
                  >
                    {t("deleteNotification")}
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
