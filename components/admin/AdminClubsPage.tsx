"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  rpcAdminClubApproveRequest,
  rpcAdminClubSetStatus,
  rpcAdminClubRequestsList,
  rpcAdminClubsList,
} from "@/lib/supabase/clubs";
import { GN_PRIMARY_BUTTON_CLASS, GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

function detailLine(label: string, value: unknown): { label: string; value: string } | null {
  const text = value == null ? "" : String(value).trim();
  if (!text) return null;
  return { label, value: text };
}

export function AdminClubsPage() {
  const t = useTranslations("clubs");
  const [clubs, setClubs] = useState<Record<string, unknown>[]>([]);
  const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastApproved, setLastApproved] = useState<{
    clubCode: string;
    slug: string;
    clubName: string;
  } | null>(null);

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

  async function approveRequest(id: string, clubName: string) {
    setBusy(id);
    setLastApproved(null);
    const result = await rpcAdminClubApproveRequest(id);
    setBusy(null);
    if (!result.ok) {
      setLoadError(result.error ?? t("adminApproveError"));
      return;
    }
    if (result.clubCode && result.slug) {
      setLastApproved({ clubCode: result.clubCode, slug: result.slug, clubName });
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

      {lastApproved ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <p>{t("adminApprovedSuccess", { club: lastApproved.clubName, code: lastApproved.clubCode })}</p>
          <Link
            href={`/clubs/${lastApproved.slug}`}
            className="mt-2 inline-block text-emerald-300 underline hover:text-emerald-200"
          >
            {t("adminViewClubProfile")}
          </Link>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {t("adminPendingRequests")}
        </h2>
        {requests.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("noPendingRequests")}</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((req) => {
              const details = [
                detailLine(t("fieldCountry"), req.country),
                detailLine(t("fieldContactPerson"), req.contact_person),
                detailLine(t("fieldContactEmail"), req.email),
                detailLine(t("fieldInstagram"), req.instagram),
                detailLine(t("fieldWebsite"), req.website),
                detailLine(t("fieldEstimatedPlayers"), req.estimated_players),
                detailLine(t("fieldMessage"), req.message),
              ].filter(Boolean) as { label: string; value: string }[];

              return (
                <li
                  key={String(req.id)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="text-lg font-semibold text-zinc-100">{String(req.club_name)}</p>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    {details.map((row) => (
                      <div key={row.label} className="min-w-0">
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          {row.label}
                        </dt>
                        <dd className="mt-0.5 break-words text-sm text-zinc-200">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <button
                    type="button"
                    disabled={busy === String(req.id)}
                    onClick={() => void approveRequest(String(req.id), String(req.club_name))}
                    className={`${GN_PRIMARY_BUTTON_CLASS} mt-4 text-xs`}
                  >
                    {t("adminApproveClub")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {t("adminAllClubs")}
        </h2>
        {clubs.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("adminNoClubsYet")}</p>
        ) : (
          <ul className="space-y-2">
            {clubs.map((club) => (
              <li
                key={String(club.id)}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-zinc-100">{String(club.name)}</p>
                  <p className="text-xs text-zinc-400">
                    {String(club.partnership_status)} · {String(club.approved_player_count ?? 0)}{" "}
                    {t("playersShort").toLowerCase()} · {t("inviteLink")}:{" "}
                    <span className="font-mono text-orange-300">{String(club.club_code)}</span>
                  </p>
                  {club.contact_email ? (
                    <p className="text-xs text-zinc-500">
                      {t("fieldContactEmail")}: {String(club.contact_email)}
                    </p>
                  ) : null}
                  {club.slug ? (
                    <Link
                      href={`/clubs/${String(club.slug)}`}
                      className="inline-block text-xs text-orange-300 hover:underline"
                    >
                      {t("viewClub")}
                    </Link>
                  ) : null}
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
        )}
      </section>
    </div>
  );
}
