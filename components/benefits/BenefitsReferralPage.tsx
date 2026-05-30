"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { hrefWithLocale } from "@/i18n/routing";
import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import { resetAppShellHorizontalScroll } from "@/lib/feed/feedScrollContract";
import {
  APP_MOBILE_PAGE_INSET_CLASS,
  BENEFITS_PAGE_SHELL_CLASS,
} from "@/lib/layout/appShellClasses";
import { copyTextToClipboard } from "@/lib/share/copyToClipboard";
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
        <Link href={ctaHref} className={`${primaryButtonClass} mt-5 inline-flex items-center justify-center`}>
          {ctaLabel}
        </Link>
      </section>
    </BenefitsPageShell>
  );
}

function runBenefitsMountedScrollReset() {
  if (typeof window === "undefined") return;
  if (!window.matchMedia("(max-width: 1023px)").matches) return;
  resetAppShellHorizontalScroll();
  if (typeof window.scrollTo === "function") {
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("[data-app-main], [data-app-main-inner]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.scrollTop = 0;
      node.scrollLeft = 0;
    }
  });
}

function BenefitsScrollEndSpacer() {
  return (
    <div
      aria-hidden
      className="pointer-events-none shrink-0 max-lg:block max-lg:h-[calc(var(--gn-app-bottom-nav-offset-measured,var(--gn-app-bottom-nav-offset,4.5rem))+2rem)] lg:hidden"
    />
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
    <BenefitsMobileShell>
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-gn-text max-lg:text-base sm:text-2xl">
          {title}
        </h1>
      </header>
      {children}
      <BenefitsScrollEndSpacer />
    </BenefitsMobileShell>
  );
}

function BenefitsMobileShell({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    runBenefitsMountedScrollReset();
    const frame = requestAnimationFrame(runBenefitsMountedScrollReset);
    const t0 = window.setTimeout(runBenefitsMountedScrollReset, 0);
    const t100 = window.setTimeout(runBenefitsMountedScrollReset, 100);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t0);
      window.clearTimeout(t100);
    };
  }, []);

  return (
    <div data-benefits-page className={BENEFITS_PAGE_SHELL_CLASS}>
      <div
        data-benefits-inset
        className={`${APP_MOBILE_PAGE_INSET_CLASS} space-y-6 max-lg:space-y-3 sm:space-y-6`}
      >
        {children}
      </div>
    </div>
  );
}

const cardClass =
  "box-border w-full min-w-0 max-w-full overflow-x-clip rounded-xl border border-orange-500/60 bg-gn-surface/20 p-4 shadow-sm max-lg:p-2.5 sm:p-5";

const primaryButtonClass =
  "box-border w-full max-w-full min-w-0 rounded-lg bg-orange-500 px-3 py-2.5 text-xs font-semibold text-black shadow-sm transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 max-lg:py-2 sm:w-auto sm:min-w-[12rem] sm:rounded-xl sm:px-4 sm:py-3";

const secondaryButtonClass =
  "box-border w-full max-w-full min-w-0 rounded-lg border border-gn-border bg-gn-surface px-3 py-2 text-xs font-medium text-gn-text transition hover:border-orange-500/50 hover:bg-gn-surface-elevated disabled:cursor-not-allowed disabled:opacity-40 max-lg:py-1.5 sm:py-2.5";

const accentOutlineButtonClass =
  "box-border w-full max-w-full min-w-0 rounded-lg border border-orange-500/50 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40 max-lg:py-1.5 sm:py-2.5";

const linkBoxClass =
  "box-border w-full min-w-0 max-w-full overflow-x-auto rounded-lg border border-gn-border-subtle bg-gn-surface/30 px-2.5 py-2 font-mono text-[10px] leading-snug text-gn-text break-all max-lg:max-h-16 sm:px-3 sm:py-2.5 sm:text-xs";

function isShareCancelled(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function BenefitsScoutInfo() {
  const t = useTranslations("benefits");

  return (
    <BenefitsPageShell title={t("scoutBenefitsTitle")}>
      <section className={cardClass}>
        <p className="text-sm leading-relaxed text-gn-text-secondary">{t("scoutBenefitsBody")}</p>
        <Link href="/premium" className={`${primaryButtonClass} mt-5 inline-flex items-center justify-center`}>
          {t("scoutBenefitsCta")}
        </Link>
      </section>
    </BenefitsPageShell>
  );
}

export type BenefitsReferralPageVariant = "invite-only" | "settings-extras";

type BenefitsReferralPageProps = {
  variant?: BenefitsReferralPageVariant;
};

export function BenefitsReferralPage({ variant = "settings-extras" }: BenefitsReferralPageProps) {
  if (variant === "invite-only") {
    return <BenefitsPlayerReferralContent mode="invite" />;
  }
  return <BenefitsReferralExtrasPage />;
}

function BenefitsReferralExtrasPage() {
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
      <BenefitsMobileShell>
        <p className="text-sm text-gn-text-secondary">{tCommon("loadingEllipsis")}</p>
      </BenefitsMobileShell>
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

  if (snapshot.audience === "player") {
    return <BenefitsPlayerReferralContent mode="invite" />;
  }

  return null;
}

function BenefitsPlayerReferralContent({ mode }: { mode: "invite" | "rewards" }) {
  const t = useTranslations("benefits");
  const tCommon = useTranslations("common");
  const tShare = useTranslations("share");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<ReferralDashboard | null>(null);
  const [loadError, setLoadError] = useState<ReferralDashboardFailureReason | string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

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
    setCopyFailed(false);
    const ok = await copyTextToClipboard(inviteUrl);
    if (ok) {
      showCopiedToast();
      return;
    }
    setCopied(false);
    setCopyFailed(true);
    window.setTimeout(() => setCopyFailed(false), 5000);
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
      <BenefitsMobileShell>
        <p className="text-sm text-gn-text-secondary">{tCommon("loadingEllipsis")}</p>
      </BenefitsMobileShell>
    );
  }

  const inviteFields = (
    <>
      <p className="text-sm leading-relaxed text-gn-text-secondary">{t("inviteFriendsCta")}</p>

      <button
        type="button"
        onClick={onInvitePrimary}
        disabled={!hasLink}
        className={primaryButtonClass}
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
            className={secondaryButtonClass}
          >
            {t("copyLink")}
          </button>
          <button
            type="button"
            onClick={onShareSecondary}
            disabled={!hasLink}
            className={accentOutlineButtonClass}
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
      {copyFailed ? (
        <p className="text-sm font-medium text-red-300/90" role="alert">
          {tShare("copyFailed")}
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
    </>
  );

  const rewardsFields = (
    <>
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
    </>
  );

  if (mode === "invite") {
    return (
      <BenefitsMobileShell>
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-gn-text max-lg:text-base sm:text-2xl">
            {t("benefitsTitle")}
          </h1>
        </header>

        <section className="space-y-4 max-lg:space-y-2.5" aria-labelledby="benefits-invite-heading">
          <h2
            id="benefits-invite-heading"
            className="text-lg font-semibold text-gn-text max-lg:text-sm"
          >
            {t("inviteFriends")}
          </h2>
          {inviteFields}
        </section>

        <section
          className="space-y-4 max-lg:space-y-2.5"
          aria-labelledby="benefits-invite-progress-heading"
        >
          {rewardsFields}
        </section>

        <BenefitsScrollEndSpacer />
      </BenefitsMobileShell>
    );
  }

  return (
    <BenefitsMobileShell>
      <section className="space-y-4 max-lg:space-y-2.5" aria-labelledby="benefits-rewards-heading">
        <h2
          id="benefits-rewards-heading"
          className="text-lg font-semibold text-gn-text max-lg:text-sm"
        >
          {t("benefitsTitle")}
        </h2>
        {rewardsFields}
      </section>
      <BenefitsScrollEndSpacer />
    </BenefitsMobileShell>
  );
}
