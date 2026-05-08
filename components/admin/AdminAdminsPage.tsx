"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  rpcAdminListStaffUsers,
  rpcAdminSetStaffRole,
  type StaffUserRow,
} from "@/lib/supabase/adminSystem";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Link } from "@/i18n/navigation";

export function AdminAdminsPage() {
  const t = useTranslations("adminDashboard");
  const { isSuperAdmin, loaded } = useAdminAccess();
  const [rows, setRows] = useState<StaffUserRow[]>([]);

  const load = useCallback(async () => {
    const { rows: s } = await rpcAdminListStaffUsers();
    setRows(s);
  }, []);

  useEffect(() => {
    if (loaded && isSuperAdmin) void load();
  }, [load, loaded, isSuperAdmin]);

  if (!loaded) return null;
  if (!isSuperAdmin) {
    return (
      <p className="text-amber-200/90">{t("adminsSuperOnly")}</p>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">{t("adminsTitle")}</h1>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm"
          >
            <div>
              <p className="text-white">{r.email ?? r.id}</p>
              <p className="text-xs text-zinc-500">{r.admin_role}</p>
              <Link
                href={`/admin/users/${r.id}`}
                className="text-xs text-orange-400 hover:underline"
              >
                {t("adminsOpenUser")}
              </Link>
            </div>
            <select
              suppressHydrationWarning
              defaultValue={r.admin_role ?? ""}
              onChange={async (e) => {
                const v = e.target.value.trim() || null;
                const { ok, error } = await rpcAdminSetStaffRole(r.id, v);
                if (!ok) alert(error ?? t("setStaffRoleFailed"));
                void load();
              }}
              className="rounded border border-white/15 bg-black/60 px-2 py-1 text-xs text-white"
            >
              <option value="">{t("staffRoleRevoke")}</option>
              <option value="super_admin">{t("userDetailStaffSuperAdmin")}</option>
              <option value="support_admin">{t("userDetailStaffSupportAdmin")}</option>
              <option value="moderator">{t("userDetailStaffModerator")}</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
