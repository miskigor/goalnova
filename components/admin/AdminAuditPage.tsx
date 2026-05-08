"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { rpcAdminListAuditLog, type AdminAuditRow } from "@/lib/supabase/adminSystem";

export function AdminAuditPage() {
  const t = useTranslations("adminDashboard");
  const [rows, setRows] = useState<AdminAuditRow[]>([]);

  const load = useCallback(async () => {
    const { rows: r } = await rpcAdminListAuditLog(150);
    setRows(r);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">{t("auditTitle")}</h1>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-white/10 text-zinc-500">
            <tr>
              <th className="px-2 py-2">{t("auditColWhen")}</th>
              <th className="px-2 py-2">{t("auditColAction")}</th>
              <th className="px-2 py-2">{t("auditColTarget")}</th>
              <th className="px-2 py-2">{t("auditColDetails")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 text-zinc-400">
                <td className="px-2 py-2 tabular-nums">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-2 py-2 text-zinc-200">{r.action}</td>
                <td className="px-2 py-2 font-mono">{r.target_user_id ?? "—"}</td>
                <td className="max-w-md truncate px-2 py-2 font-mono">
                  {r.details ? JSON.stringify(r.details) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
