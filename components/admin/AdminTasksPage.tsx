"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  rpcAdminListSupportTickets,
  rpcAdminUpdateSupportTicket,
  type SupportTicketRow,
} from "@/lib/supabase/adminSystem";

const TICKET_STATUS_KEYS = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;

const TICKET_STATUS_I18N: Record<
  string,
  | "ticketStatus_open"
  | "ticketStatus_in_progress"
  | "ticketStatus_resolved"
  | "ticketStatus_closed"
> = {
  open: "ticketStatus_open",
  in_progress: "ticketStatus_in_progress",
  resolved: "ticketStatus_resolved",
  closed: "ticketStatus_closed",
};

export function AdminTasksPage() {
  const t = useTranslations("adminDashboard");
  const tc = useTranslations("common");
  const [rows, setRows] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { rows: tix } = await rpcAdminListSupportTickets({
      status: null,
      assignedToMe: true,
    });
    setRows(tix);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">{t("tasksTitle")}</h1>
      {loading ? (
        <p className="text-zinc-500">{tc("loadingEllipsis")}</p>
      ) : rows.length === 0 ? (
        <p className="text-zinc-500">{t("tasksEmptyAssigned")}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm"
            >
              <p className="font-medium text-white">{row.subject}</p>
              <p className="text-xs text-zinc-500">
                {TICKET_STATUS_I18N[row.status]
                  ? t(TICKET_STATUS_I18N[row.status])
                  : row.status}
              </p>
              <Link
                href={`/admin/users/${row.user_id}`}
                className="text-xs text-orange-400 hover:underline"
              >
                {t("supportTicketUserLink")}
              </Link>
              <select
                suppressHydrationWarning
                className="mt-2 block rounded border border-white/15 bg-black/60 px-2 py-1 text-xs text-white"
                defaultValue={row.status}
                onChange={async (e) => {
                  await rpcAdminUpdateSupportTicket({
                    ticketId: row.id,
                    status: e.target.value,
                  });
                  void load();
                }}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
