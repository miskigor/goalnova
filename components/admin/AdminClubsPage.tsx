"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  rpcAdminClubApproveRequest,
  rpcAdminClubSetStatus,
  rpcAdminClubRequestsList,
  rpcAdminClubsList,
} from "@/lib/supabase/clubs";
import { GN_PRIMARY_BUTTON_CLASS, GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

export function AdminClubsPage() {
  const t = useTranslations("clubs");
  const [clubs, setClubs] = useState<Record<string, unknown>[]>([]);
  const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [c, r] = await Promise.all([rpcAdminClubsList(), rpcAdminClubRequestsList()]);
    if (c.error || r.error) {
      setLoadError(c.error ?? r.error ?? t("adminLoadError"));
      setClubs([]);
      setRequests([]);
    } else {
      setClubs(c.rows);
      setRequests(r.rows);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approveRequest(id: string) {
    setBusy(id);
    const result = await rpcAdminClubApproveRequest(id);
    setBusy(null);
    if (!result.ok) {
      setLoadError(result.error ?? t("adminApproveError"));
      return;
    }
    await load();
  }

  async function setStatus(clubId: string, status: "active" | "suspended" | "pending") {
    setBusy(clubId);
    await rpcAdminClubSetStatus(clubId, status);
    setBusy(null);
    await load();
  }

  if (loading) {
    return <p className="p-6 text-sm text-zinc-400">{t("loading")}</p>;
  }

  return (
    <div className="min-w-0 space-y-8 p-4 sm:p-6">
      <h1 className="text-xl font-bold text-zinc-100">{t("adminTitle")}</h1>
      <p className="text-sm text-zinc-400">{t("adminHint")}</p>

      {loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError.includes("Could not find the function") || loadError.includes("Forbidden")
            ? t("adminLoadErrorMigration")
            : loadError}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {t("adminPendingRequests")}
        </h2>
        {requests.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("noPendingRequests")}</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((req) => (
              <li
                key={String(req.id)}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
              >
                <p className="font-medium text-zinc-100">{String(req.club_name)}</p>
                <p className="text-xs text-zinc-400">
                  {String(req.contact_person)} · {String(req.email)}
                </p>
                <button
                  type="button"
                  disabled={busy === String(req.id)}
                  onClick={() => void approveRequest(String(req.id))}
                  className={`${GN_PRIMARY_BUTTON_CLASS} mt-3 text-xs`}
                >
                  {t("adminApproveClub")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {t("adminAllClubs")}
        </h2>
        <ul className="space-y-2">
          {clubs.map((club) => (
            <li
              key={String(club.id)}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div>
                <p className="font-medium text-zinc-100">{String(club.name)}</p>
                <p className="text-xs text-zinc-400">
                  {String(club.partnership_status)} · {String(club.approved_player_count)} players ·{" "}
                  {String(club.club_code)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === String(club.id)}
                  onClick={() => void setStatus(String(club.id), "active")}
                  className={`${GN_PRIMARY_BUTTON_CLASS} text-xs`}
                >
                  {t("adminActivate")}
                </button>
                <button
                  type="button"
                  disabled={busy === String(club.id)}
                  onClick={() => void setStatus(String(club.id), "suspended")}
                  className={`${GN_SECONDARY_BUTTON_CLASS} text-xs`}
                >
                  {t("adminSuspend")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
