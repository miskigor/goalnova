"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  fetchAdminUnreadSupportCount,
  listAdminUnreadInboxItems,
  markAllAdminSupportMessagesRead,
  markAdminSupportMessagesRead,
  markAdminSupportNotificationsReadForTicketOwner,
  rpcAdminDeleteSupportTicketMessage,
  rpcAdminListSupportTicketMessages,
  rpcAdminListStaffUsers,
  rpcAdminListSupportTickets,
  rpcAdminReplySupportTicket,
  rpcAdminUpdateSupportTicket,
  type StaffUserRow,
  type AdminInboxItem,
  type SupportTicketMessageRow,
  type SupportTicketRow,
} from "@/lib/supabase/adminSystem";
import { supabase } from "@/lib/supabase/client";

const TICKET_STATUS_KEYS = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;

const PRIORITY_KEYS = ["low", "normal", "high", "urgent"] as const;

export function AdminSupportTicketsPage() {
  const t = useTranslations("adminDashboard");
  const tc = useTranslations("common");
  const [rows, setRows] = useState<SupportTicketRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessageRow[]>([]);
  const [replyText, setReplyText] = useState("");
  const [staff, setStaff] = useState<StaffUserRow[]>([]);
  const [inboxItems, setInboxItems] = useState<AdminInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { rows: tix } = await rpcAdminListSupportTickets({
      status: null,
      assignedToMe: false,
    });
    setRows(tix);
    const { rows: s } = await rpcAdminListStaffUsers();
    setStaff(s);
    const { items } = await listAdminUnreadInboxItems();
    setInboxItems(items);
    if (!selectedId && tix.length > 0) {
      setSelectedId(tix[0].id);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void (async () => {
      const { rows: m } = await rpcAdminListSupportTicketMessages(selectedId);
      setMessages(m);
    })();
  }, [selectedId]);

  useEffect(() => {
    void (async () => {
      await markAllAdminSupportMessagesRead();
      await fetchAdminUnreadSupportCount();
      await load();
    })();
  }, [load]);

  useEffect(() => {
    if (!selected?.user_id) return;
    void (async () => {
      if (!selectedId) return;
      await markAdminSupportMessagesRead(selectedId);
      await markAdminSupportNotificationsReadForTicketOwner(selected.user_id);
      await fetchAdminUnreadSupportCount();
    })();
  }, [selected?.id, selected?.user_id, selectedId]);

  useEffect(() => {
    const ch = supabase
      .channel("admin-support-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_ticket_messages" },
        () => {
          void load();
          if (!selectedId) return;
          void rpcAdminListSupportTicketMessages(selectedId).then(({ rows }) => setMessages(rows));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load, selectedId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-white">{t("supportTitle")}</h1>
        <button
          type="button"
          disabled={markingAllRead}
          onClick={async () => {
            setMarkingAllRead(true);
            await markAllAdminSupportMessagesRead();
            await fetchAdminUnreadSupportCount();
            await load();
            setMarkingAllRead(false);
          }}
          className="rounded border border-white/20 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
        >
          {markingAllRead ? "Marking..." : "Mark all support read"}
        </button>
      </div>
      {inboxItems.length > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
            Admin inbox
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-100">
            {inboxItems.slice(0, 8).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-white/20 bg-black/30 px-2 py-0.5 text-[11px] font-medium">
                  {item.label}
                </span>
                <span className="text-zinc-300">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : "now"}
                </span>
                <Link
                  href={item.kind === "scout_verification" ? "/admin/scout-verifications" : "/admin/support"}
                  className="text-orange-300 hover:underline"
                >
                  {item.kind === "scout_verification" ? "Otvori verifikacije" : "Otvori support"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {loading ? (
        <p className="text-zinc-500">{tc("loadingEllipsis")}</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr),minmax(0,1fr)]">
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Created at</th>
                  <th className="px-3 py-2">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/10 text-zinc-200">
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${row.user_id}`} className="text-orange-300 hover:underline">
                        {t("supportTicketUserLink")}
                      </Link>
                    </td>
                    <td className="max-w-[16rem] truncate px-3 py-2">{row.subject}</td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.priority}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-4">
            {selected ? (
              <div className="space-y-3">
                <div>
                  <p className="text-base font-semibold text-white">{selected.subject}</p>
                  <p className="text-xs text-zinc-400">
                    {selected.category} · {selected.status} · {selected.priority}
                  </p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-zinc-300">{selected.message}</p>

                <div className="grid gap-2 md:grid-cols-3">
                  <select
                    suppressHydrationWarning
                    value={selected.status}
                    onChange={async (e) => {
                      await rpcAdminUpdateSupportTicket({
                        ticketId: selected.id,
                        status: e.target.value,
                      });
                      await load();
                    }}
                    className="rounded border border-white/15 bg-black/60 px-2 py-1 text-xs text-white"
                  >
                    {TICKET_STATUS_KEYS.map((s) => (
                      <option key={s} value={s}>
                        {t(
                          (
                            {
                              open: "ticketStatus_open",
                              in_progress: "ticketStatus_in_progress",
                              resolved: "ticketStatus_resolved",
                              closed: "ticketStatus_closed",
                            } as const
                          )[s],
                        )}
                      </option>
                    ))}
                  </select>
                  <select
                    suppressHydrationWarning
                    value={selected.priority}
                    onChange={async (e) => {
                      await rpcAdminUpdateSupportTicket({
                        ticketId: selected.id,
                        priority: e.target.value,
                      });
                      await load();
                    }}
                    className="rounded border border-white/15 bg-black/60 px-2 py-1 text-xs text-white"
                  >
                    {PRIORITY_KEYS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <select
                    suppressHydrationWarning
                    value={selected.assigned_admin_id ?? ""}
                    onChange={async (e) => {
                      const v = e.target.value;
                      await rpcAdminUpdateSupportTicket({
                        ticketId: selected.id,
                        assignedAdminId: v || null,
                        clearAssignment: !v,
                      });
                      await load();
                    }}
                    className="rounded border border-white/15 bg-black/60 px-2 py-1 text-xs text-white"
                  >
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {(s.email ?? s.id).slice(0, 40)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        m.sender_admin_id
                          ? "ms-auto max-w-[92%] bg-orange-500/20 text-orange-100"
                          : "me-auto max-w-[92%] bg-white/10 text-zinc-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="whitespace-pre-wrap">{m.message}</span>
                        <button
                          type="button"
                          disabled={deletingMessageId === m.id}
                          onClick={async () => {
                            if (!selected) return;
                            setDeletingMessageId(m.id);
                            const res = await rpcAdminDeleteSupportTicketMessage({ messageId: m.id });
                            if (res.ok) {
                              const { rows: next } = await rpcAdminListSupportTicketMessages(selected.id);
                              setMessages(next);
                              await load();
                            }
                            setDeletingMessageId(null);
                          }}
                          className="rounded border border-white/20 px-2 py-0.5 text-[10px] font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                        >
                          {deletingMessageId === m.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply to ticket"
                  rows={3}
                  className="w-full rounded border border-white/15 bg-black/60 px-3 py-2 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const body = replyText.trim();
                    if (body.length < 2) return;
                    const res = await rpcAdminReplySupportTicket({
                      ticketId: selected.id,
                      message: body,
                    });
                    if (!res.ok) return;
                    setReplyText("");
                    const { rows: m } = await rpcAdminListSupportTicketMessages(selected.id);
                    setMessages(m);
                    await load();
                  }}
                  className="rounded bg-orange-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-orange-400"
                >
                  Reply
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Select a ticket.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
