"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import {
  adminListAccountRecoveryRequests,
  adminResolveAccountRecoveryRequest,
  type AccountRecoveryRequestRow,
} from "@/lib/supabase/accountRecovery";

export function AdminAccountRecoveryPage() {
  const t = useTranslations("adminAccountRecovery");

  const [rows, setRows] = useState<AccountRecoveryRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { rows: next, error: err } = await adminListAccountRecoveryRequests(supabase, 300);
    if (err) setError(err);
    setRows(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markResolved(id: string) {
    setBusyId(id);
    const { error: err } = await adminResolveAccountRecoveryRequest(supabase, id);
    setBusyId(null);
    if (err) {
      setError(err);
      return;
    }
    await load();
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-50"
        >
          {t("refresh")}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm text-zinc-200">
            <thead className="border-b border-white/10 bg-black/40 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">{t("colAccountEmail")}</th>
                <th className="px-3 py-2 font-medium">{t("colContactEmail")}</th>
                <th className="px-3 py-2 font-medium">{t("colUsername")}</th>
                <th className="px-3 py-2 font-medium">{t("colMessage")}</th>
                <th className="px-3 py-2 font-medium">{t("colStatus")}</th>
                <th className="px-3 py-2 font-medium">{t("colCreated")}</th>
                <th className="px-3 py-2 font-medium">{t("colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.06] align-top">
                  <td className="max-w-[160px] break-all px-3 py-2 text-zinc-300">{r.account_email}</td>
                  <td className="max-w-[160px] break-all px-3 py-2 text-zinc-300">{r.contact_email}</td>
                  <td className="max-w-[120px] break-all px-3 py-2 text-zinc-400">
                    {r.username?.trim() || "—"}
                  </td>
                  <td className="max-w-[280px] whitespace-pre-wrap break-words px-3 py-2 text-zinc-400">
                    {r.message}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{r.status}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500 tabular-nums">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {r.status === "open" ? (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void markResolved(r.id)}
                        className="rounded-lg bg-orange-500/20 px-2 py-1 text-xs font-semibold text-orange-200 ring-1 ring-orange-500/35 hover:bg-orange-500/30 disabled:opacity-50"
                      >
                        {busyId === r.id ? t("marking") : t("markResolved")}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600">{t("resolved")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
