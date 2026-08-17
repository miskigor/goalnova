"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { hrefWithLocale } from "@/i18n/routing";
import {
  rpcClubAcceptPartnershipAgreement,
  rpcClubDashboard,
  rpcClubReviewMembership,
  mapManagedClubProfile,
  type ClubDashboardPending,
  type ClubDashboardPlayer,
  type ManagedClubProfile,
} from "@/lib/supabase/clubs";
import { ClubProfileEditor } from "@/components/clubs/ClubProfileEditor";
import { GN_PRIMARY_BUTTON_CLASS, GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

export function ClubDashboardView() {
  const t = useTranslations("clubs");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const clubId = searchParams.get("club");
  const [club, setClub] = useState<Record<string, unknown> | null>(null);
  const [pending, setPending] = useState<ClubDashboardPending[]>([]);
  const [players, setPlayers] = useState<ClubDashboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!clubId) {
      setLoading(false);
      setError(t("dashboardNoClub"));
      return;
    }
    setLoading(true);
    const result = await rpcClubDashboard(clubId);
    if (!result.ok) {
      setError(result.error ?? t("dashboardForbidden"));
      setClub(null);
    } else {
      setClub(result.club);
      setPending(result.pending);
      setPlayers(result.players);
      setError(null);
    }
    setLoading(false);
  }, [clubId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(membershipId: string, approve: boolean) {
    setBusyId(membershipId);
    await rpcClubReviewMembership(membershipId, approve);
    setBusyId(null);
    await load();
  }

  async function acceptAgreement() {
    if (!clubId) return;
    await rpcClubAcceptPartnershipAgreement(clubId);
    await load();
  }

  if (loading) {
    return <p className="px-4 py-10 text-center text-sm text-gn-text-secondary">{t("loading")}</p>;
  }

  if (error || !club) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-red-200">{error ?? t("dashboardForbidden")}</p>
        <Link href="/clubs" className={`${GN_PRIMARY_BUTTON_CLASS} mt-4 inline-flex`}>
          {t("backToClubs")}
        </Link>
      </div>
    );
  }

  const minPlayers = Number(club.minimum_players_required ?? 20);
  const approvedCount = Number(club.approved_player_count ?? 0);
  const needsAgreement = !club.partnership_agreement_accepted_at;
  const mostActive = [...players].sort((a, b) => b.xp - a.xp).slice(0, 5);
  const leastActive = [...players].sort((a, b) => a.xp - b.xp).slice(0, 5);
  const clubCode = String(club.club_code ?? "").trim();
  const inviteUrl = clubCode
    ? `https://pitchrusch.com${hrefWithLocale(`/invite/${clubCode}`, locale)}`
    : "";

  async function copyInviteCode() {
    if (!clubCode) return;
    try {
      await navigator.clipboard.writeText(clubCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gn-text-tertiary">
          {t("clubDashboard")}
        </p>
        <h1 className="text-2xl font-bold text-gn-text">{String(club.name ?? "")}</h1>
        <p className="text-sm text-gn-text-secondary">
          {t("dashboardStats", {
            players: approvedCount,
            xp: Number(club.total_xp ?? 0).toLocaleString(),
            videos: Number(club.total_videos ?? 0),
          })}
        </p>
      </header>

      {clubCode ? (
        <section className="rounded-2xl border border-gn-accent/35 bg-gn-accent/10 p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gn-text-tertiary">
            {t("inviteLink")}
          </h2>
          <p className="mt-2 font-mono text-2xl font-bold tracking-wider text-gn-text">{clubCode}</p>
          {inviteUrl ? (
            <p className="mt-2 break-all font-mono text-xs text-gn-accent sm:text-sm">{inviteUrl}</p>
          ) : null}
          <p className="mt-2 text-xs text-gn-text-secondary">{t("inviteHint", { code: clubCode })}</p>
          <button
            type="button"
            onClick={() => void copyInviteCode()}
            className={`${GN_PRIMARY_BUTTON_CLASS} mt-3 text-xs`}
          >
            {copied ? t("inviteCodeCopied") : t("copyInviteCode")}
          </button>
        </section>
      ) : null}

      <ClubProfileEditor
        club={mapManagedClubProfile(club)}
        showDashboardLink={false}
        onClubChange={(next: ManagedClubProfile) =>
          setClub((prev) => (prev ? { ...prev, ...next } : prev))
        }
      />

      {needsAgreement ? (
        <section className="rounded-2xl border border-gn-accent/35 bg-gn-accent/10 p-4">
          <p className="text-sm text-gn-text">{t("partnershipAgreementBody")}</p>
          <button type="button" onClick={() => void acceptAgreement()} className={`${GN_PRIMARY_BUTTON_CLASS} mt-3`}>
            {t("acceptPartnershipAgreement")}
          </button>
        </section>
      ) : null}

      {!needsAgreement && approvedCount < minPlayers ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          {t("playersNeededForPartner", { count: minPlayers - approvedCount })}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gn-text">{t("pendingRequests")}</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-gn-text-secondary">{t("noPendingRequests")}</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((row) => (
              <li
                key={row.membership_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gn-text">
                    {t("wantsToJoin", { name: row.display_name })}
                  </p>
                  {row.username ? (
                    <p className="text-xs text-gn-text-secondary">@{row.username}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.membership_id}
                    onClick={() => void review(row.membership_id, true)}
                    className={`${GN_PRIMARY_BUTTON_CLASS} text-xs`}
                  >
                    {t("approve")}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.membership_id}
                    onClick={() => void review(row.membership_id, false)}
                    className={`${GN_SECONDARY_BUTTON_CLASS} text-xs`}
                  >
                    {t("reject")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gn-text">{t("mostActivePlayers")}</h2>
          <PlayerMiniList players={mostActive} />
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gn-text">{t("leastActivePlayers")}</h2>
          <PlayerMiniList players={leastActive} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gn-text">{t("xpLeaderboard")}</h2>
        <PlayerMiniList players={players} showVideos />
      </section>
    </div>
  );
}

function PlayerMiniList({
  players,
  showVideos = false,
}: {
  players: ClubDashboardPlayer[];
  showVideos?: boolean;
}) {
  if (players.length === 0) {
    return <p className="text-sm text-gn-text-secondary">—</p>;
  }
  return (
    <ul className="space-y-2">
      {players.map((p) => (
        <li
          key={p.membership_id}
          className="flex items-center justify-between gap-3 rounded-xl border border-gn-border-subtle bg-gn-surface/30 px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gn-text">{p.display_name}</p>
            {p.username ? (
              <p className="truncate text-xs text-gn-text-secondary">@{p.username}</p>
            ) : null}
          </div>
          <p className="shrink-0 text-xs font-semibold tabular-nums text-gn-accent">
            {p.xp} XP{showVideos ? ` · ${p.videos} vid` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
