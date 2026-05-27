"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { usePremium } from "@/components/premium/PremiumProvider";
import { createStripeCheckout } from "@/lib/stripe/client";
import type { PaidSubscriptionPlan } from "@/lib/stripe/plans";
import { supabase } from "@/lib/supabase/client";
import { useEffect } from "react";

type PlanCard = {
  key: "freePlayer" | "playerPremium" | "freeScout" | "scoutPro" | "club";
  paidPlan?: PaidSubscriptionPlan;
  priceKey: string;
  featureKeys: string[];
  audience: "player" | "scout";
};

const CARDS: PlanCard[] = [
  { key: "freePlayer", priceKey: "freePrice", featureKeys: ["f1", "f2", "f3"], audience: "player" },
  {
    key: "playerPremium",
    paidPlan: "player_premium",
    priceKey: "playerPremiumPrice",
    featureKeys: ["f1", "f2", "f3", "f4", "f5"],
    audience: "player",
  },
  { key: "freeScout", priceKey: "freePrice", featureKeys: ["f1", "f2", "f3"], audience: "scout" },
  {
    key: "scoutPro",
    paidPlan: "scout_pro",
    priceKey: "scoutProPrice",
    featureKeys: ["f1", "f2", "f3", "f4", "f5"],
    audience: "scout",
  },
  {
    key: "club",
    paidPlan: "club",
    priceKey: "clubPrice",
    featureKeys: ["f1", "f2", "f3", "f4", "f5"],
    audience: "scout",
  },
];

export function PricingView() {
  const t = useTranslations("billing");
  const locale = useLocale();
  const router = useRouter();
  const { userId, premiumLoaded } = usePremium();
  const [userRole, setUserRole] = useState<"player" | "scout" | null>(null);
  const [roleLoading, setRoleLoading] = useState<boolean>(false);
  const [busyPlan, setBusyPlan] = useState<PaidSubscriptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setUserRole(null);
      setRoleLoading(false);
      return;
    }
    setRoleLoading(true);
    void (async () => {
      const { data } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
      if (!mounted) return;
      const role = String(data?.role ?? "").trim();
      setUserRole(role === "player" ? "player" : role === "scout" ? "scout" : null);
      setRoleLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  async function startCheckout(plan: PaidSubscriptionPlan) {
    if (!userId) {
      router.push("/login");
      return;
    }
    setError(null);
    setBusyPlan(plan);
    const { url, error: checkoutError } = await createStripeCheckout(plan, locale);
    setBusyPlan(null);
    if (checkoutError || !url) {
      setError(checkoutError ?? t("checkoutError"));
      return;
    }
    window.location.assign(url);
  }

  const shouldHoldCards = !premiumLoaded || (Boolean(userId) && roleLoading);

  const visibleCards = shouldHoldCards
    ? []
    : userRole === "player" || userRole === "scout"
      ? CARDS.filter((card) => card.audience === userRole)
      : CARDS;

  return (
    <div className="box-border w-full min-w-0 max-w-full space-y-5 overflow-x-clip max-lg:space-y-4">
      <div className="min-w-0 max-w-full">
        <h1 className="break-words text-2xl font-bold text-gn-text max-lg:text-base">{t("title")}</h1>
        <p className="mt-2 text-sm text-gn-text-secondary">{t("subtitle")}</p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/35 bg-red-950/30 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      {shouldHoldCards ? (
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/35 p-5 text-sm text-gn-text-secondary max-lg:p-4">
          {t("loadingCheckout")}
        </div>
      ) : null}

      <div className="grid w-full min-w-0 max-w-full gap-4 overflow-x-clip md:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map((card) => (
          <article
            key={card.key}
            className="box-border min-w-0 max-w-full overflow-hidden rounded-2xl border border-gn-border-subtle bg-gn-surface/35 p-5 max-lg:p-4"
          >
            <h2 className="break-words text-lg font-semibold text-gn-text max-lg:text-sm">
              {t(`${card.key}.title`)}
            </h2>
            {card.key === "playerPremium" || card.key === "scoutPro" ? (
              <p className="mt-2 text-sm text-gn-text-secondary">{t(`${card.key}.description`)}</p>
            ) : null}
            <p className="mt-1 text-sm font-medium text-gn-text">{t(card.priceKey)}</p>
            <ul className="mt-4 list-disc space-y-1.5 ps-5 text-sm text-gn-text-secondary">
              {card.featureKeys.map((f) => (
                <li key={f}>{t(`${card.key}.${f}`)}</li>
              ))}
            </ul>
            {card.paidPlan ? (
              <button
                type="button"
                onClick={() => void startCheckout(card.paidPlan!)}
                disabled={busyPlan === card.paidPlan}
                className="mt-4 w-full rounded-xl bg-gn-accent px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-55"
              >
                {busyPlan === card.paidPlan
                  ? t("loadingCheckout")
                  : card.paidPlan === "player_premium"
                    ? t("upgradePlayerPremium")
                    : card.paidPlan === "scout_pro"
                      ? t("upgradeScoutPro")
                      : t("subscribe")}
              </button>
            ) : (
              <button
                type="button"
                className="mt-4 w-full rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-4 py-2.5 text-sm font-semibold text-gn-text-secondary"
              >
                {t("currentFree")}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

