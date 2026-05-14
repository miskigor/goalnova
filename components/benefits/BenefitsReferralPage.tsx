"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { hrefWithLocale } from "@/i18n/routing";
import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import { fetchReferralDashboard, type ReferralDashboard } from "@/lib/supabase/referrals";

const cardClass =
  "rounded-xl border border-orange-500/60 bg-gn-surface/20 p-4 shadow-sm sm:p-5";

export function BenefitsReferralPage() {
  const t = useTranslations("benefits");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<ReferralDashboard | null>(null);
  const [copied, setCopied] = useState(false);

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
  const has3 = (dash?.grantedKeys ?? []).includes("invite_3_player_premium");
  const has10 = (dash?.grantedKeys ?? []).includes("invite_10_featured_player");

  const onInvite = useCallback(() => {
    if (!inviteUrl) return;
    const shareData = { title: APP_DISPLAY_NAME, text: t("inviteFriendsCta"), url: inviteUrl };
    void (async () => {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share(shareData);
          return;
        } catch {
          return;
        }
      }
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 5000);
      } catch {
        setCopied(false);
      }
    })();
  }, [inviteUrl, t]);

  if (loading) {
    return (
      <div className="min-w-0 max-w-full py-6">
        <p className="text-sm text-gn-text-secondary">{tCommon("loadingEllipsis")}</p>
      </div>
    );
  }

  if (!dash?.referralCode) {
    return (
      <div className="min-w-0 max-w-full space-y-4 py-2">
        <h1 className="text-xl font-semibold tracking-tight text-gn-text sm:text-2xl">{t("benefitsTitle")}</h1>
        <p className="text-sm text-gn-text-secondary">{t("referralNotAvailable")}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-8 pb-4 sm:space-y-10">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-gn-text sm:text-2xl">{t("benefitsTitle")}</h1>
      </header>

      <section className="space-y-5" aria-labelledby="benefits-invite-heading">
        <h2 id="benefits-invite-heading" className="text-lg font-semibold text-gn-text">
          {t("inviteFriends")}
        </h2>
        <p className="text-sm leading-relaxed text-gn-text-secondary">{t("inviteFriendsCta")}</p>

        <button
          type="button"
          onClick={onInvite}
          className="w-full rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-semibold text-black shadow-sm transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg sm:w-auto sm:min-w-[12rem]"
        >
          {t("inviteFriendButton")}
        </button>

        {copied ? (
          <p className="text-sm font-medium text-orange-400" role="status">
            {t("inviteLinkCopied")}
          </p>
        ) : null}

        <p className="text-sm font-medium text-gn-text">{t("invitedPlayers", { count: n })}</p>

        <div className="space-y-2 text-sm text-gn-text-secondary">
          <p>{t("invite3Progress", { count: n })}</p>
          <p>{t("invite10Progress", { count: n })}</p>
        </div>

        <ul className="flex flex-col gap-4">
          <li className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-gn-text">{t("invite3RewardTitle")}</p>
                <p className="text-sm text-gn-text-secondary">{t("invite3RewardDescription")}</p>
              </div>
              <span
                className={
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold " +
                  (has3
                    ? "border-orange-500/50 bg-orange-500/15 text-orange-300"
                    : "border-orange-500/40 bg-gn-surface/40 text-gn-text-tertiary")
                }
              >
                {has3 ? t("unlocked") : t("locked")}
              </span>
            </div>
          </li>
          <li className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-gn-text">{t("invite10RewardTitle")}</p>
                <p className="text-sm text-gn-text-secondary">{t("invite10RewardDescription")}</p>
              </div>
              <span
                className={
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold " +
                  (has10
                    ? "border-orange-500/50 bg-orange-500/15 text-orange-300"
                    : "border-orange-500/40 bg-gn-surface/40 text-gn-text-tertiary")
                }
              >
                {has10 ? t("unlocked") : t("locked")}
              </span>
            </div>
          </li>
        </ul>

        <p className="text-xs leading-relaxed text-gn-text-tertiary">{t("referralTermsShort")}</p>
      </section>
    </div>
  );
}
