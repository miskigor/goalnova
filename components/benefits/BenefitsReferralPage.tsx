"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { hrefWithLocale } from "@/i18n/routing";
import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import {
  resolveBenefitsAudience,
  type BenefitsAudienceSnapshot,
} from "@/lib/benefits/benefitsAudience";
import { devError } from "@/lib/devLog";
import { PITCHRUSCH_PREMIUM_UPDATED_EVENT } from "@/lib/supabase/premium";
import {
  fetchReferralDashboard,
  tryConsumePendingReferralWhenPlayerReady,
  tryConsumePendingReferralWithRetry,
  type ReferralDashboard,
  type ReferralDashboardFailureReason,
} from "@/lib/supabase/referrals";

function referralLoadErrorKey(
  reason: ReferralDashboardFailureReason | string | null,
): string | null {
  switch (reason) {
    case "not_player_role":
      return "referralErrorNotPlayer";
    case "ensure_code_failed":
    case "missing_referral_code":
      return "referralErrorEnsureCode";
    case "not_authenticated":
      return "referralErrorNotSignedIn";
    case "dashboard_unavailable":
      return "referralErrorTransport";
    default:
      return reason ? "referralLinkErrorGeneric" : null;
  }
}

function BenefitsInfoCard({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <BenefitsPageShell title={title}>
      <section className={cardClass}>
        <p className="text-sm leading-relaxed text-gn-text-secondary">{body}</p>
        <Link
          href={ctaHref}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3.5 text-xs font-semibold text-black shadow-sm transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg max-lg:px-2 max-lg:py-1.5 sm:w-auto sm:min-w-[12rem]"
        >
          {ctaLabel}
        </Link>
      </section>
    </BenefitsPageShell>
  );
}

function BenefitsPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="box-border min-w-0 w-full max-w-full space-y-6 overflow-x-clip max-lg:space-y-2">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-gn-text max-lg:text-base sm:text-2xl">
          {title}
        </h1>
      </header>
      {children}
    </div>
  );
}

const cardClass =
  "rounded-xl border border-orange-500/60 bg-gn-surface/20 p-4 shadow-sm max-lg:p-2 sm:p-5";

const linkBoxClass =
  "box-border w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-gn-border-subtle bg-gn-surface/30 px-3 py-2.5 font-mono text-xs leading-relaxed text-gn-text break-all sm:text-sm";

function isShareCancelled(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function BenefitsScoutInfo() {
  const t = useTranslations("benefits");

  return (
    <div className="box-border min-w-0 w-full max-w-full space-y-6 overflow-x-clip max-lg:space-y-2">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-gn-text max-lg:text-base sm:text-2xl">
          {t("scoutBenefitsTitle")}
        </h1>
      </header>
      <section className={cardClass}>
        <p className="text-sm leading-relaxed text-gn-text-secondary">{t("scoutBenefitsBody")}</p>
        <Link
          href="/premium"
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3.5 text-xs font-semibold text-black shadow-sm transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg max-lg:mt-4 max-lg:px-2 max-lg:py-1.5 sm:w-auto sm:min-w-[12rem]"
        >
          {t("scoutBenefitsCta")}
        </Link>
      </section>
    </div>
  );
}

export function BenefitsReferralPage() {
  const tCommon = useTranslations("common");
  const t = useTranslations("benefits");
  const [snapshot, setSnapshot] = useState<BenefitsAudienceSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await resolveBenefitsAudience();
      if (!cancelled) setSnapshot(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!snapshot) {
    return (
      <div className="min-w-0 max-w-full py-6">
        <p className="text-sm text-gn-text-secondary">{tCommon("loadingEllipsis")}</p>
      </div>
    );
  }

  if (snapshot.audience === "admin") {
    return (
      <BenefitsInfoCard
        title={t("adminBenefitsTitle")}
        body={t("adminBenefitsBody")}
        ctaHref="/admin"
        ctaLabel={t("adminBenefitsCta")}
      />
    );
  }

  if (snapshot.audience === "needs_role") {
    return (
      <BenefitsInfoCard
        title={t("needsRoleBenefitsTitle")}
        body={t("needsRoleBenefitsBody")}
        ctaHref="/role"
        ctaLabel={t("needsRoleBenefitsCta")}
      />
    );
  }

  if (snapshot.audience === "player_setup_incomplete") {
    return (
      <BenefitsInfoCard
        title={t("playerSetupBenefitsTitle")}
        body={t("playerSetupBenefitsBody")}
        ctaHref="/role"
        ctaLabel={t("playerSetupBenefitsCta")}
      />
    );
  }

  if (snapshot.audience === "scout") {
    return <BenefitsScoutInfo />;
  }

  return <BenefitsPlayerReferralContent />;
}

function BenefitsPlayerReferralContent() {
  const t = useTranslations("benefits");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<ReferralDashboard | null>(null);
  const [loadError, setLoadError] = useState<ReferralDashboardFailureReason | string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data, errorMessage, failureReason } = await fetchReferralDashboard();
    setDash(data);
    setLoadError(failureReason ?? errorMessage);
    if (process.env.NODE_ENV === "development") {
      if (failureReason || errorMessage) {
        devError("[benefits] fetchReferralDashboard failed", {
          failureReason,
          errorMessage,
        });
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      await tryConsumePendingReferralWhenPlayerReady();
      await load();
      window.setTimeout(() => void load(), 5000);
    })();
  }, [load]);

  useEffect(() => {
    const onPremium = () => {
      void (async () => {
        await tryConsumePendingReferralWithRetry();
        void load();
      })();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void (async () => {
          await tryConsumePendingReferralWithRetry();
          void load();
        })();
      }
    };
    window.addEventListener(PITCHRUSCH_PREMIUM_UPDATED_EVENT, onPremium);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener(PITCHRUSCH_PREMIUM_UPDATED_EVENT, onPremium);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const inviteUrl = useMemo(() => {
    if (!dash?.referralCode) return "";
    const path = `/signup?ref=${encodeURIComponent(dash.referralCode)}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${hrefWithLocale(path, locale)}`;
  }, [dash?.referralCode, locale]);

  const hasLink = Boolean(inviteUrl);
  const errorKey = referralLoadErrorKey(loadError);
  const linkErrorMessage = errorKey
    ? errorKey === "referralLinkErrorGeneric"
      ? t("referralLinkErrorGeneric", { reason: loadError ?? "" })
      : t(errorKey)
    : null;
  const n = dash?.inviteCount ?? 0;
  const has3 = (dash?.grantedKeys ?? []).includes("invite_3_player_premium");
  const has10 = (dash?.grantedKeys ?? []).includes("invite_10_featured_player");

  const showCopiedToast = useCallback(() => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 5000);
  }, []);

  const copyInviteUrl = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showCopiedToast();
    } catch {
      setCopied(false);
    }
  }, [inviteUrl, showCopiedToast]);

  const shareData = useMemo(
    () => ({ title: APP_DISPLAY_NAME, text: t("inviteFriendsCta"), url: inviteUrl }),
    [inviteUrl, t],
  );

  /** Orange primary: native share if available; otherwise copy. Share cancel does not copy. */
  const onInvitePrimary = useCallback(() => {
    if (!inviteUrl) return;
    void (async () => {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share(shareData);
        } catch (e) {
          if (isShareCancelled(e)) return;
          await copyInviteUrl();
        }
        return;
      }
      await copyInviteUrl();
    })();
  }, [copyInviteUrl, inviteUrl, shareData]);

  /** Share row: share if supported, else same as copy. */
  const onShareSecondary = useCallback(() => {
    if (!inviteUrl) return;
    void (async () => {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share(shareData);
        } catch (e) {
          if (isShareCancelled(e)) return;
          await copyInviteUrl();
        }
        return;
      }
      await copyInviteUrl();
    })();
  }, [copyInviteUrl, inviteUrl, shareData]);

  if (loading) {
    return (
      <div className="min-w-0 max-w-full py-6">
        <p className="text-sm text-gn-text-secondary">{tCommon("loadingEllipsis")}</p>
      </div>
    );
  }

  return (
    <div className="box-border min-w-0 w-full max-w-full space-y-8 overflow-x-clip max-lg:space-y-2 sm:space-y-10">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-gn-text max-lg:text-base sm:text-2xl">
          {t("benefitsTitle")}
        </h1>
      </header>

      <section className="space-y-5 max-lg:space-y-2" aria-labelledby="benefits-invite-heading">
        <h2 id="benefits-invite-heading" className="text-lg font-semibold text-gn-text max-lg:text-sm">
          {t("inviteFriends")}
        </h2>
        <p className="text-sm leading-relaxed text-gn-text-secondary">{t("inviteFriendsCta")}</p>

        <button
          type="button"
          onClick={onInvitePrimary}
          disabled={!hasLink}
          className="w-full rounded-xl bg-orange-500 px-4 py-3.5 text-xs font-semibold text-black shadow-sm transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 max-lg:px-2 max-lg:py-1.5 sm:w-auto sm:min-w-[12rem]"
        >
          {t("inviteFriendButton")}
        </button>

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-gn-text-tertiary">
            {t("yourInviteLink")}
          </p>
          <div className={linkBoxClass}>
            {hasLink ? (
              inviteUrl
            ) : (
              <span className="font-sans text-sm text-gn-text-secondary">
                {linkErrorMessage ?? t("referralLinkUnavailable")}
              </span>
            )}
          </div>
          {!hasLink && loadError ? (
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void load();
              }}
              className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
            >
              {t("referralRetry")}
            </button>
          ) : null}
          <div className="flex flex-col gap-2 max-lg:gap-1.5 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void copyInviteUrl()}
              disabled={!hasLink}
              className="rounded-xl border border-gn-border bg-gn-surface px-4 py-2.5 text-xs font-medium text-gn-text transition hover:border-orange-500/50 hover:bg-gn-surface-elevated disabled:cursor-not-allowed disabled:opacity-40 max-lg:px-2 max-lg:py-1.5"
            >
              {t("copyLink")}
            </button>
            <button
              type="button"
              onClick={onShareSecondary}
              disabled={!hasLink}
              className="rounded-xl border border-orange-500/50 bg-orange-500/10 px-4 py-2.5 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40 max-lg:px-2 max-lg:py-1.5"
            >
              {t("shareLink")}
            </button>
          </div>
        </div>

        {copied ? (
          <p className="text-sm font-medium text-orange-400" role="status">
            {t("inviteLinkCopied")}
          </p>
        ) : null}

        <div
          className="rounded-xl border border-gn-border-subtle bg-gn-surface/25 p-4 max-lg:p-2"
          aria-labelledby="benefits-invite-rules-heading"
        >
          <h3 id="benefits-invite-rules-heading" className="text-sm font-semibold text-gn-text">
            {t("inviteRulesTitle")}
          </h3>
          <ol className="mt-2 list-decimal space-y-1.5 ps-4 text-sm leading-relaxed text-gn-text-secondary">
            <li>{t("inviteRulesStep1")}</li>
            <li>{t("inviteRulesStep2")}</li>
            <li>{t("inviteRulesStep3")}</li>
          </ol>
        </div>

        <p className="text-sm font-medium text-gn-text">{t("invitedPlayers", { count: n })}</p>

        <div className="space-y-2 text-sm text-gn-text-secondary">
          <p>{t("invite3Progress", { count: n })}</p>
          <p>{t("invite10Progress", { count: n })}</p>
        </div>

        <ul className="flex flex-col gap-4 max-lg:gap-3">
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
