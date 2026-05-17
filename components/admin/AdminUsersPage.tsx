"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { adminHardDeleteUser } from "@/lib/supabase/adminDeleteUser";
import {
  rpcAdminCreateTicketForUser,
  rpcAdminListUsers,
  rpcAdminSetDeleted,
  rpcAdminSetStaffRole,
  rpcAdminSetSuspended,
  type AdminUserListRow,
} from "@/lib/supabase/adminSystem";
import { devLog } from "@/lib/devLog";
import { useAdminAccess } from "@/hooks/useAdminAccess";

export function AdminUsersPage() {
  const t = useTranslations("adminDashboard");
  const tc = useTranslations("common");
  const { isSuperAdmin, isModerator } = useAdminAccess();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AdminUserListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { rows: next, error: err } = await rpcAdminListUsers({
      search: search.trim() || null,
      limit: 80,
    });
    if (err) setError(t("loadUsersError"));
    setRows(next);
    setLoading(false);
  }, [search, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleSuspend(row: AdminUserListRow) {
    setActionError(null);
    if (!isSuperAdmin && !isModerator) {
      setActionError(t("suspendForbidden"));
      return;
    }
    const nextSuspended = !row.is_suspended;
    const snapshot = rows;
    setBusyId(row.id);
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, is_suspended: nextSuspended } : r,
      ),
    );
    const { ok, error: e } = await rpcAdminSetSuspended(row.id, nextSuspended);
    setBusyId(null);
    if (!ok) {
      setRows(snapshot);
      setActionError(e ?? tc("failed"));
      return;
    }
    void load();
  }

  async function toggleDeleted(row: AdminUserListRow) {
    if (!isSuperAdmin) return;
    if (
      !window.confirm(
        row.is_deleted
          ? t("userListConfirmRestore")
          : t("userListConfirmSoftDelete"),
      )
    ) {
      return;
    }
    setBusyId(row.id);
    const nextDeleted = !row.is_deleted;
    const snapshot = rows;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, is_deleted: nextDeleted } : r,
      ),
    );
    const { ok, error: e } = await rpcAdminSetDeleted(row.id, nextDeleted);
    setBusyId(null);
    if (!ok) {
      setRows(snapshot);
      alert(e ?? tc("failed"));
      return;
    }
    devLog("ADMIN SOFT DELETE CLICK", {
      userId: row.id,
      p_deleted: nextDeleted,
      columnUsed: "is_deleted",
    });
    void load();
  }

  async function assignIssue(row: AdminUserListRow) {
    const subject = window.prompt(
      t("ticketSubject"),
      t("ticketPromptDefaultSubject"),
    );
    if (!subject?.trim()) return;
    const message = window.prompt(
      t("ticketMessage"),
      t("ticketPromptDefaultMessage"),
    );
    if (!message?.trim()) return;
    setBusyId(row.id);
    const { id, error: e } = await rpcAdminCreateTicketForUser(
      row.id,
      subject.trim(),
      message.trim(),
      null,
    );
    setBusyId(null);
    if (!id) {
      alert(e ?? tc("failed"));
      return;
    }
    alert(t("ticketCreatedAlert", { id }));
  }

  async function hardDeleteUser(row: AdminUserListRow) {
    setActionError(null);
    if (!isSuperAdmin) {
      setActionError(t("hardDeleteForbidden"));
      return;
    }
    if (
      !window.confirm(
        t("userListConfirmHardDelete", {
          email: row.email ?? row.username ?? row.id,
        }),
      )
    ) {
      return;
    }
    setBusyId(row.id);
    const result = await adminHardDeleteUser(row.id);
    setBusyId(null);
    if (!result.ok) {
      if (result.reason === "cannot_delete_self") {
        setActionError(t("cannotDeleteSelf"));
      } else if (result.reason === "cannot_delete_super_admin") {
        setActionError(t("cannotDeleteSuperAdmin"));
      } else if (result.reason === "forbidden") {
        setActionError(t("hardDeleteForbidden"));
      } else {
        setActionError(result.errorMessage ?? tc("failed"));
      }
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    void load();
  }

  async function toggleModerator(row: AdminUserListRow) {
    if (!isSuperAdmin) return;
    const nextRole = row.admin_role === "moderator" ? null : "moderator";
    setBusyId(row.id);
    const { ok, error: e } = await rpcAdminSetStaffRole(row.id, nextRole);
    setBusyId(null);
    if (!ok) {
      alert(e ?? tc("failed"));
      return;
    }
    void load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">{t("usersTitle")}</h1>
      <div className="flex flex-wrap gap-2">
        <input
          suppressHydrationWarning
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-w-[200px] flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/5 disabled:opacity-50"
        >
          {tc("search")}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {actionError ? (
        <p className="text-sm text-red-300" role="alert">
          {actionError}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 bg-black/40 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">{t("usersColName")}</th>
              <th className="px-3 py-2">{t("usersColEmail")}</th>
              <th className="px-3 py-2">{t("usersColRole")}</th>
              <th className="px-3 py-2">{t("usersColScout")}</th>
              <th className="px-3 py-2">{t("usersColPremium")}</th>
              <th className="px-3 py-2">{t("usersColFlags")}</th>
              <th className="px-3 py-2">{t("usersColActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  {tc("loadingEllipsis")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/5 hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2 text-zinc-200">
                    <div className="font-medium">
                      {row.full_name?.trim() || "—"}
                    </div>
                    <div className="text-xs text-zinc-500">
                      @{row.username?.trim() || "—"}
                    </div>
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-zinc-400">
                    {row.email ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{row.role}</td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {row.scout_verification_status}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {row.is_premium ? tc("yes") : tc("no")}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {row.is_suspended ? `${t("flagSuspended")} ` : ""}
                    {row.is_deleted ? t("flagDeleted") : ""}
                    {!row.is_suspended && !row.is_deleted ? t("none") : ""}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Link
                        href={`/admin/users/${row.id}`}
                        className="rounded bg-orange-500/20 px-2 py-1 text-xs font-medium text-orange-200 hover:bg-orange-500/30"
                      >
                        {t("open")}
                      </Link>
                      {isSuperAdmin || isModerator ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void toggleSuspend(row)}
                          className="rounded bg-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-50"
                        >
                          {row.is_suspended ? t("unsuspend") : t("suspend")}
                        </button>
                      ) : null}
                      {isSuperAdmin ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void toggleDeleted(row)}
                          className="rounded bg-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-50"
                        >
                          {row.is_deleted ? t("restore") : t("softDelete")}
                        </button>
                      ) : null}
                      {isSuperAdmin ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void hardDeleteUser(row)}
                          className="rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {t("hardDelete")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void assignIssue(row)}
                        className="rounded bg-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-50"
                      >
                        {t("assignIssue")}
                      </button>
                      {isSuperAdmin ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void toggleModerator(row)}
                          className="rounded bg-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-50"
                        >
                          {row.admin_role === "moderator"
                            ? t("removeModerator")
                            : t("makeModerator")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
