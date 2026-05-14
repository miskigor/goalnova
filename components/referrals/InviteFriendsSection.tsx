"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { hrefWithLocale } from "@/i18n/routing";
import {
  fetchReferralDashboard,
  tryConsumePendingReferral,
  type ReferralDashboard,
} from "@/lib/supabase/referrals";

function clampPct(n: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((n / max) * 100));
}

export function InviteFriendsSection({ className = "" }: { className?: string }) {
  const t = useTranslations("inviteFriends");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<ReferralDashboard | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const load = useCallback(async () => {
    await tryConsumePendingReferral();
    const { data } = await fetchReferralDashboard();
    setDash(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inviteUrl = useMemo(() => {
    if (!dash?.referralCode) return "";
    const path = `/signup?ref=${encodeURIComponent(dash.referralCode)}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${hrefWithLocale(path, locale)}`;
  }, [dash?.referralCode, locale]);

  const pct3 = clampPct(dash?.inviteCount ?? 0, 3);
  const pct10 = clampPct(dash?.inviteCount ?? 0, 10);

  const has3 = (dash?.grantedKeys ?? []).includes("invite_3_player_premium");
  const has10 = (dash?.grantedKeys ?? []).includes("invite_10_featured_player");

  const toGo3 = Math.max(0, 3 - (dash?.inviteCount ?? 0));
  const toGo10 = Math.max(0, 10 - (dash?.inviteCount ?? 0));

  async function onCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setCopyDone(false);
    }
  }

  async function onShare() {
    if (!inviteUrl) return;
    const shareData = {
      title: "PitchRusch",
      text: t("inviteFriendsCta"),
      url: inviteUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await onCopy();
      }
    } catch {
      /* user cancelled share */
    }
  }

  if (loading) {
    return (
      <div className={`rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4 ${className}`}>
        <p className="text-sm text-gn-text-secondary">{tCommon("loadingEllipsis")}</p>
      </div>
    );
  }

  if (!dash?.referralCode) {
    return null;
  }

  return (
    <section
      className={`space-y-4 rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4 sm:p-5 ${className}`}
    >
      <div>
        <h2 className="text-lg font-semibold text-gn-text">{t("inviteFriendsTitle")}</h2>
        <p className="mt-1 text-sm text-gn-text-secondary">{t("inviteFriendsSubtitle")}</p>
        <p className="mt-2 text-sm text-gn-text">{t("inviteFriendsCta")}</p>
        <p className="mt-2 text-sm text-gn-text-secondary">{t("inviteFriendsDescription")}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
          {t("shareWithTeam")}
        </p>
        <div className="break-all rounded-lg border border-gn-border bg-gn-surface px-3 py-2 font-mono text-xs text-gn-text">
          {inviteUrl}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onCopy()}
            className="rounded-xl border border-gn-border bg-gn-surface px-4 py-2 text-sm font-medium text-gn-text transition-colors hover:border-gn-accent/50"
          >
            {copyDone ? t("inviteLinkCopied") : t("copyInviteLink")}
          </button>
          <button
            type="button"
            onClick={() => void onShare()}
            className="rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            {t("shareInviteLink")}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gn-border-subtle bg-gn-surface/30 p-3">
          <p className="text-xs text-gn-text-tertiary">{t("invitedPlayers")}</p>
          <p className="mt-1 text-2xl font-bold text-gn-text">{dash.inviteCount}</p>
          <p className="mt-1 text-xs text-gn-text-secondary">
            {(dash.inviteCount ?? 0)} {t("playersInvited")}
          </p>
        </div>
        <div className="rounded-lg border border-gn-border-subtle bg-gn-surface/30 p-3">
          <p className="text-xs text-gn-text-tertiary">{t("yourReferralProgress")}</p>
          <p className="mt-2 text-xs text-gn-text-secondary">
            {t("invite3RewardTitle")}: {toGo3} {t("playersToGo")}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gn-border">
            <div className="h-full rounded-full bg-gn-accent transition-all" style={{ width: `${pct3}%` }} />
          </div>
          <p className="mt-3 text-xs text-gn-text-secondary">
            {t("invite10RewardTitle")}: {toGo10} {t("playersToGo")}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gn-border">
            <div className="h-full rounded-full bg-gn-accent/70 transition-all" style={{ width: `${pct10}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
          {t("unlockPremiumBoost")}
        </p>
        <ul className="space-y-2 text-sm text-gn-text-secondary">
          <li className="rounded-lg border border-gn-border-subtle bg-gn-surface/20 p-3">
            <p className="font-medium text-gn-text">{t("invite3RewardTitle")}</p>
            <p className="mt-0.5">{t("invite3RewardDescription")}</p>
            {has3 ? (
              <p className="mt-2 text-xs font-semibold text-gn-accent">{t("premiumBoostUnlocked")}</p>
            ) : null}
          </li>
          <li className="rounded-lg border border-gn-border-subtle bg-gn-surface/20 p-3">
            <p className="font-medium text-gn-text">{t("invite10RewardTitle")}</p>
            <p className="mt-0.5">{t("invite10RewardDescription")}</p>
            {has10 ? (
              <p className="mt-2 text-xs font-semibold text-gn-accent">{t("featuredBadgeUnlocked")}</p>
            ) : null}
          </li>
        </ul>
      </div>

      <p className="text-xs text-gn-text-tertiary">{t("referralTermsShort")}</p>
    </section>
  );
}
