"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { hrefWithLocale } from "@/i18n/routing";
import { fetchReferralDashboard, type ReferralDashboard } from "@/lib/supabase/referrals";

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
  const [copyHint, setCopyHint] = useState(false);

  const load = useCallback(async () => {
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

  const n = dash?.inviteCount ?? 0;
  const pct3 = clampPct(n, 3);
  const pct10 = clampPct(n, 10);

  const has3 = (dash?.grantedKeys ?? []).includes("invite_3_player_premium");
  const has10 = (dash?.grantedKeys ?? []).includes("invite_10_featured_player");

  function onCopy() {
    if (!inviteUrl) return;
    void (async () => {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setCopyHint(true);
        window.setTimeout(() => setCopyHint(false), 5000);
      } catch {
        setCopyHint(false);
      }
    })();
  }

  function onShare() {
    if (!inviteUrl) return;
    const shareData = {
      title: "PitchRusch",
      text: t("inviteFriendsCta"),
      url: inviteUrl,
    };
    void (async () => {
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(inviteUrl);
          setCopyHint(true);
          window.setTimeout(() => setCopyHint(false), 5000);
        }
      } catch {
        /* user cancelled share or clipboard denied */
      }
    })();
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
      id="invite-friends"
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
            onClick={onCopy}
            className="rounded-xl border border-gn-border bg-gn-surface px-4 py-2 text-sm font-medium text-gn-text transition-colors hover:border-gn-accent/50"
          >
            {t("copyInviteLink")}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            {t("shareInviteLink")}
          </button>
        </div>
        {copyHint ? (
          <p className="text-sm font-medium text-gn-accent" role="status">
            {t("inviteLinkCopiedFull")}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border border-gn-border-subtle bg-gn-surface/30 p-4">
        <div>
          <p className="text-sm font-semibold text-gn-text">{t("invitedPlayersLabel", { count: n })}</p>
        </div>
        <div className="space-y-1 text-sm text-gn-text-secondary">
          <p>{t("progressInvitePremium", { current: n, target: 3 })}</p>
          <div className="h-2 overflow-hidden rounded-full bg-gn-border">
            <div className="h-full rounded-full bg-gn-accent transition-all" style={{ width: `${pct3}%` }} />
          </div>
        </div>
        <div className="space-y-1 text-sm text-gn-text-secondary">
          <p>{t("progressInviteFeatured", { current: n, target: 10 })}</p>
          <div className="h-2 overflow-hidden rounded-full bg-gn-border">
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
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gn-text">{t("invite3RewardTitle")}</p>
                <p className="mt-0.5">{t("invite3RewardDescription")}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  has3 ? "bg-gn-accent/20 text-gn-accent" : "bg-gn-border text-gn-text-tertiary"
                }`}
              >
                {has3 ? t("rewardStatusUnlocked") : t("rewardStatusLocked")}
              </span>
            </div>
            {has3 ? (
              <p className="mt-2 text-xs font-semibold text-gn-accent">{t("premiumBoostUnlocked")}</p>
            ) : null}
          </li>
          <li className="rounded-lg border border-gn-border-subtle bg-gn-surface/20 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gn-text">{t("invite10RewardTitle")}</p>
                <p className="mt-0.5">{t("invite10RewardDescription")}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  has10 ? "bg-gn-accent/20 text-gn-accent" : "bg-gn-border text-gn-text-tertiary"
                }`}
              >
                {has10 ? t("rewardStatusUnlocked") : t("rewardStatusLocked")}
              </span>
            </div>
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
