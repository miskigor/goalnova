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
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { devLog } from "@/lib/devLog";
import { useAdminAccess } from "@/hooks/useAdminAccess";

function userDisplayName(row: AdminUserListRow): string {
  return row.full_name?.trim() || "—";
}

function userAvatarLabel(row: AdminUserListRow): string {
  return row.full_name?.trim() || row.username?.trim() || row.email || "—";
}

function userFlagsLabel(
  row: AdminUserListRow,
  t: (key: string) => string,
): string {
  const parts: string[] = [];
  if (row.is_suspended) parts.push(t("flagSuspended"));
  if (row.is_deleted) parts.push(t("flagDeleted"));
  return parts.length > 0 ? parts.join(", ") : t("none");
}

type RowActionsProps = {
  row: AdminUserListRow;
  busyId: string | null;
  isSuperAdmin: boolean;
  isModerator: boolean;
  t: (key: string, values?: Record<string, string>) => string;
  tc: (key: string) => string;
  onToggleSuspend: (row: AdminUserListRow) => void;
  onToggleDeleted: (row: AdminUserListRow) => void;
  onHardDelete: (row: AdminUserListRow) => void;
  onAssignIssue: (row: AdminUserListRow) => void;
  onToggleModerator: (row: AdminUserListRow) => void;
};

function AdminUserRowActions({
  row,
  busyId,
  isSuperAdmin,
  isModerator,
  t,
  tc,
  onToggleSuspend,
  onToggleDeleted,
  onHardDelete,
  onAssignIssue,
  onToggleModerator,
}: RowActionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
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
          onClick={() => onToggleSuspend(row)}
          className="rounded bg-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-50"
        >
          {row.is_suspended ? t("unsuspend") : t("suspend")}
        </button>
      ) : null}
      {isSuperAdmin ? (
        <button
          type="button"
          disabled={busyId === row.id}
          onClick={() => onToggleDeleted(row)}
          className="rounded bg-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-50"
        >
          {row.is_deleted ? t("restore") : t("softDelete")}
        </button>
      ) : null}
      {isSuperAdmin ? (
        <button
          type="button"
          disabled={busyId === row.id}
          onClick={() => onHardDelete(row)}
          className="rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-500/30 disabled:opacity-50"
        >
          {t("hardDelete")}
        </button>
      ) : null}
      <button
        type="button"
        disabled={busyId === row.id}
        onClick={() => onAssignIssue(row)}
        className="rounded bg-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-50"
      >
        {t("assignIssue")}
      </button>
      {isSuperAdmin ? (
        <button
          type="button"
          disabled={busyId === row.id}
          onClick={() => onToggleModerator(row)}
          className="rounded bg-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-50"
        >
          {row.admin_role === "moderator" ? t("removeModerator") : t("makeModerator")}
        </button>
      ) : null}
    </div>
  );
}

function AdminUserMobileCard(props: RowActionsProps) {
  const { row, t, tc } = props;

  return (
    <article className="box-border min-w-0 rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="flex min-w-0 items-start gap-3">
        <ProfileAvatar
          name={userAvatarLabel(row)}
          imageUrl={row.avatar_url?.trim() || undefined}
          sizeClassName="h-10 w-10 text-xs"
        />
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <p className="font-medium text-zinc-100">{userDisplayName(row)}</p>
          <p className="text-xs text-zinc-500">@{row.username?.trim() || "—"}</p>
          {row.email ? (
            <p className="mt-1 text-xs leading-snug text-zinc-400 [overflow-wrap:anywhere]">
              {row.email}
            </p>
          ) : null}
        </div>
      </div>
      <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="text-zinc-500">{t("usersColRole")}</dt>
          <dd className="text-zinc-300 [overflow-wrap:anywhere]">{row.role ?? "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-zinc-500">{t("usersColScout")}</dt>
          <dd className="text-zinc-300 [overflow-wrap:anywhere]">
            {row.scout_verification_status ?? "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-zinc-500">{t("usersColPremium")}</dt>
          <dd className="text-zinc-300">{row.is_premium ? tc("yes") : tc("no")}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-zinc-500">{t("usersColFlags")}</dt>
          <dd className="text-zinc-300 [overflow-wrap:anywhere]">
            {userFlagsLabel(row, t)}
          </dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-white/10 pt-3">
        <AdminUserRowActions {...props} />
      </div>
    </article>
  );
}

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

  const rowActionProps: Omit<RowActionsProps, "row"> = {
    busyId,
    isSuperAdmin,
    isModerator,
    t,
    tc,
    onToggleSuspend: (row) => void toggleSuspend(row),
    onToggleDeleted: (row) => void toggleDeleted(row),
    onHardDelete: (row) => void hardDeleteUser(row),
    onAssignIssue: (row) => void assignIssue(row),
    onToggleModerator: (row) => void toggleModerator(row),
  };

  return (
    <div className="box-border min-w-0 space-y-4 overflow-x-clip">
      <h1 className="text-xl font-semibold text-white md:text-2xl">{t("usersTitle")}</h1>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          suppressHydrationWarning
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="box-border min-w-0 w-full flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-500 sm:min-w-[200px]"
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="w-full shrink-0 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/5 disabled:opacity-50 sm:w-auto"
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

      <div className="md:hidden">
        {loading ? (
          <p className="py-8 text-center text-sm text-zinc-500">{tc("loadingEllipsis")}</p>
        ) : (
          <ul className="min-w-0 space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="min-w-0">
                <AdminUserMobileCard row={row} {...rowActionProps} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
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
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ProfileAvatar
                        name={userAvatarLabel(row)}
                        imageUrl={row.avatar_url?.trim() || undefined}
                        sizeClassName="h-9 w-9 text-xs"
                      />
                      <div className="min-w-0">
                        <div className="font-medium">{userDisplayName(row)}</div>
                        <div className="text-xs text-zinc-500">
                          @{row.username?.trim() || "—"}
                        </div>
                      </div>
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
                    {userFlagsLabel(row, t)}
                  </td>
                  <td className="px-3 py-2">
                    <AdminUserRowActions row={row} {...rowActionProps} />
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
