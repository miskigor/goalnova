"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { usePremium } from "@/components/premium/PremiumProvider";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { createStripeCheckout } from "@/lib/stripe/client";
import type { PaidSubscriptionPlan } from "@/lib/stripe/plans";
import { supabase } from "@/lib/supabase/client";

const FREE_FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5"] as const;
const PRO_FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"] as const;
const CLUB_FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5", "f6", "f7"] as const;

export function PremiumUpgradeView() {
  const t = useTranslations("premium");
  const tBilling = useTranslations("billing");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const { userId, isPremium, premiumLoaded } = usePremium();

  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUpgradedPlan, setJustUpgradedPlan] = useState<"pro" | "club" | null>(null);
  const [userRole, setUserRole] = useState<"player" | "scout" | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  const contactHref = useMemo(() => {
    const subject = encodeURIComponent(t("scoutPlans.contactMailSubject"));
    return `mailto:support@pitchrusch.com?subject=${subject}`;
  }, [t]);

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setUserRole(null);
      setRoleLoaded(true);
      return;
    }
    setRoleLoaded(false);
    void (async () => {
      const { data, error: roleError } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (!mounted) return;
      if (roleError) {
        logFullSupabaseError("[premium page] users.role fetch", roleError, { userId });
      }
      const role = String(data?.role ?? "").trim();
      setUserRole(role === "player" ? "player" : role === "scout" ? "scout" : null);
      setRoleLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  async function onUpgrade(plan: "pro" | "club") {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (plan === "club") {
      window.location.href = contactHref;
      return;
    }
    setError(null);
    setUpgradeBusy(true);
    try {
      const stripePlan: PaidSubscriptionPlan = "scout_pro";
      const { url, error: checkoutError } = await createStripeCheckout(stripePlan, locale);
      if (checkoutError || !url) {
        setError(checkoutError ?? tBilling("checkoutError"));
        return;
      }
      setJustUpgradedPlan(plan);
      window.location.assign(url);
    } catch (e) {
      logFullSupabaseError("[premium page] onUpgrade", e, { userId });
      setError(tErr("premium"));
    } finally {
      setUpgradeBusy(false);
    }
  }

  if (!premiumLoaded) {
    return (
      <div
        className="flex min-h-[32vh] flex-col items-center justify-center gap-3 text-sm text-gn-text-secondary"
        role="status"
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
        {t("loading")}
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-10 text-center text-sm text-gn-text-secondary">
        <p>{t("signInToUpgrade")}</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-xl bg-gn-accent px-5 py-2.5 text-sm font-semibold text-black"
        >
          {t("goToLogin")}
        </Link>
      </div>
    );
  }

  if (!roleLoaded) {
    return (
      <div
        className="flex min-h-[28vh] flex-col items-center justify-center gap-3 text-sm text-gn-text-secondary"
        role="status"
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-8">
      {userRole === "scout" ? (
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gn-text sm:text-2xl lg:text-3xl">
            {t("scoutPlans.pageTitle")}
          </h1>
          <p className="mt-2 text-sm text-gn-text-secondary">{t("scoutPlans.pageSubtitle")}</p>
        </div>
      ) : userRole === "player" ? (
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gn-text sm:text-2xl lg:text-3xl">
            {t("playerPremium")}
          </h1>
          <p className="mt-2 text-sm text-gn-text-secondary">{t("playerPremiumDescription")}</p>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-100"
        >
          {error}
        </div>
      ) : null}

      {userRole === "player" ? (
        <article className="rounded-2xl border border-gn-accent/35 bg-gradient-to-br from-gn-accent/12 to-transparent p-5">
          <h2 className="text-lg font-semibold text-gn-text">{t("playerPremium")}</h2>
          <p className="mt-1 text-sm text-gn-text-secondary">4.99 EUR / month</p>
          <p className="mt-2 text-sm text-gn-text-secondary">{t("playerPremiumDescription")}</p>
          <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-gn-text-secondary">
            <li>{t("moreVideoUploads")}</li>
            <li>{t("priorityScoutVisibility")}</li>
            <li>{t("premiumBadge")}</li>
            <li>{t("featuredVideo")}</li>
            <li>{t("profileHighlight")}</li>
            <li>{t("detailedProfileStatistics")}</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/premium"
              className="inline-flex rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-black"
            >
              {t("upgradeToPlayerPremium")}
            </Link>
            <Link
              href="/player/stats"
              className="inline-flex rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-4 py-2 text-sm font-semibold text-gn-text"
            >
              {t("playerStatistics")}
            </Link>
          </div>
        </article>
      ) : null}

      {userRole === "scout" && isPremium ? (
        <div className="rounded-2xl border border-gn-accent/40 bg-gradient-to-br from-gn-accent/15 to-transparent px-5 py-8 text-center">
          <span className="inline-flex items-center rounded-full bg-gn-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">
            {t("scoutPlans.activeBadge")}
          </span>
          <p className="mt-4 text-lg font-semibold text-gn-text">
            {justUpgradedPlan === "club"
              ? t("scoutPlans.activeClubMessage")
              : t("scoutPlans.activeProMessage")}
          </p>
          <p className="mt-2 text-sm text-gn-text-secondary">{t("scoutPlans.unlockedHint")}</p>
        </div>
      ) : null}

      {userRole === "scout" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-5">
            <h2 className="text-lg font-semibold text-gn-text">{t("scoutPlans.free.title")}</h2>
            <p className="mt-1 text-sm text-gn-text-secondary">{t("scoutPlans.free.price")}</p>
            <ul className="mt-4 list-disc space-y-2 ps-5 text-sm text-gn-text-secondary">
              {FREE_FEATURE_KEYS.map((key) => (
                <li key={key}>{t(`scoutPlans.free.${key}`)}</li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-5 w-full rounded-xl border border-gn-border-subtle bg-gn-surface/60 py-2.5 text-sm font-semibold text-gn-text"
            >
              {t("scoutPlans.cta.startFree")}
            </button>
          </article>

          <article className="relative rounded-2xl border border-gn-accent/35 bg-gradient-to-b from-zinc-900 to-black p-5 pt-6 shadow-[0_0_40px_-12px_rgba(249,115,22,0.45)]">
            <span className="absolute end-4 top-4 inline-flex max-w-[min(100%,11rem)] justify-end sm:max-w-none">
              <span className="rounded-full bg-gn-accent px-2.5 py-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-black">
                {t("scoutPlans.recommended")}
              </span>
            </span>
            <div className="pe-[min(7.5rem,30%)]">
              <h2 className="text-lg font-semibold text-white">{t("scoutPlans.pro.title")}</h2>
              <p className="mt-1 text-sm text-zinc-300">{t("scoutPlans.pro.price")}</p>
            </div>
            <ul className="mt-4 list-disc space-y-2 ps-5 text-sm text-zinc-300">
              {PRO_FEATURE_KEYS.map((key) => (
                <li key={key}>{t(`scoutPlans.pro.${key}`)}</li>
              ))}
            </ul>
            <button
              type="button"
              disabled={upgradeBusy || isPremium}
              aria-busy={upgradeBusy}
              onClick={() => void onUpgrade("pro")}
              className="mt-5 w-full rounded-xl bg-gn-accent py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {upgradeBusy
                ? t("scoutPlans.cta.upgrading")
                : isPremium
                  ? t("scoutPlans.cta.active")
                  : t("scoutPlans.cta.upgrade")}
            </button>
          </article>

          <article className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-5 md:col-span-2 xl:col-span-1">
            <h2 className="text-lg font-semibold text-gn-text">{t("scoutPlans.club.title")}</h2>
            <p className="mt-1 text-sm text-gn-text-secondary">{t("scoutPlans.club.price")}</p>
            <ul className="mt-4 list-disc space-y-2 ps-5 text-sm text-gn-text-secondary">
              {CLUB_FEATURE_KEYS.map((key) => (
                <li key={key}>{t(`scoutPlans.club.${key}`)}</li>
              ))}
            </ul>
            <div className="mt-5 grid grid-cols-1 gap-2">
              <a
                href={contactHref}
                className="inline-flex w-full items-center justify-center rounded-xl border border-gn-border-subtle bg-gn-surface/60 py-2.5 text-sm font-semibold text-gn-text"
              >
                {t("scoutPlans.cta.contact")}
              </a>
              <button
                type="button"
                disabled={upgradeBusy || isPremium}
                aria-busy={upgradeBusy}
                onClick={() => void onUpgrade("club")}
                className="w-full rounded-xl bg-gn-accent py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {upgradeBusy
                  ? t("scoutPlans.cta.upgrading")
                  : isPremium
                    ? t("scoutPlans.cta.active")
                    : t("scoutPlans.cta.upgrade")}
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {userRole === null ? (
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-5 text-sm text-gn-text-secondary">
          <p>{t("signInToUpgrade")}</p>
        </div>
      ) : null}
    </div>
  );
}
