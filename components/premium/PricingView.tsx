"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { PremiumPlanCard, type PremiumPlanCardModel } from "@/components/premium/PremiumPlanCard";
import { PremiumScoutCarousel } from "@/components/premium/PremiumScoutCarousel";
import { usePremium } from "@/components/premium/PremiumProvider";
import { createStripeCheckout } from "@/lib/stripe/client";
import type { PaidSubscriptionPlan } from "@/lib/stripe/plans";
import { supabase } from "@/lib/supabase/client";

const CARDS: PremiumPlanCardModel[] = [
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
  const [roleLoading, setRoleLoading] = useState(false);
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

  const visibleCards: PremiumPlanCardModel[] = shouldHoldCards
    ? []
    : userRole === "player" || userRole === "scout"
      ? CARDS.filter((card) => card.audience === userRole)
      : CARDS;

  const mobileUseCarousel = visibleCards.length >= 3;
  const mobileUseTwoColumns = visibleCards.length === 2;
  const mobilePaidCard = visibleCards.find((card) => card.paidPlan);

  return (
    <div className="box-border flex w-full min-w-0 max-w-full min-h-0 flex-1 flex-col overflow-x-clip max-lg:overflow-x-visible max-lg:overflow-y-hidden max-lg:px-3 lg:space-y-5">
      <div className="min-w-0 max-w-full shrink-0 lg:space-y-2">
        <h1 className="break-words text-2xl font-bold text-gn-text max-lg:text-base max-lg:leading-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-gn-text-secondary max-lg:mt-1 max-lg:text-xs max-lg:leading-snug">
          {t("subtitle")}
        </p>
      </div>

      {error ? (
        <p className="shrink-0 rounded-xl border border-red-500/35 bg-red-950/30 px-4 py-3 text-sm text-red-100 max-lg:px-3 max-lg:py-2 max-lg:text-xs">
          {error}
        </p>
      ) : null}

      {shouldHoldCards ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-gn-border-subtle bg-gn-surface/35 p-5 text-sm text-gn-text-secondary max-lg:rounded-xl max-lg:text-xs">
          {t("loadingCheckout")}
        </div>
      ) : null}

      {!shouldHoldCards && mobileUseCarousel ? (
        <div className="hidden min-h-0 flex-1 max-lg:flex">
          <PremiumScoutCarousel cards={visibleCards} busyPlan={busyPlan} onCheckout={startCheckout} />
        </div>
      ) : null}

      {!shouldHoldCards && mobileUseTwoColumns ? (
        <div className="hidden w-full min-w-0 shrink-0 flex-col gap-3 max-lg:flex max-lg:overflow-visible">
          <div className="flex w-full min-w-0 flex-col gap-3 max-lg:overflow-visible">
            {visibleCards.map((card) => (
              <PremiumPlanCard
                key={card.key}
                card={card}
                compact
                enlarged
                hideActions
                highlighted={Boolean(card.paidPlan)}
                busyPlan={busyPlan}
                onCheckout={startCheckout}
              />
            ))}
          </div>
          <div className="grid w-full min-w-0 shrink-0 grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-3 py-2.5 text-xs font-semibold leading-tight text-gn-text-secondary"
            >
              {t("freePlayer.title")}
            </button>
            <button
              type="button"
              onClick={() => mobilePaidCard?.paidPlan && void startCheckout(mobilePaidCard.paidPlan)}
              disabled={!mobilePaidCard?.paidPlan || busyPlan === mobilePaidCard.paidPlan}
              className="rounded-xl bg-gn-accent px-3 py-2.5 text-xs font-semibold leading-tight text-black disabled:opacity-55"
            >
              {mobilePaidCard?.paidPlan && busyPlan === mobilePaidCard.paidPlan
                ? t("loadingCheckout")
                : t("playerPremium.title")}
            </button>
          </div>
        </div>
      ) : null}

      {!shouldHoldCards && !mobileUseCarousel && !mobileUseTwoColumns ? (
        <div className="hidden min-h-0 flex-1 max-lg:block">
          {visibleCards[0] ? (
            <PremiumPlanCard
              card={visibleCards[0]}
              compact
              highlighted={Boolean(visibleCards[0].paidPlan)}
              busyPlan={busyPlan}
              onCheckout={startCheckout}
            />
          ) : null}
        </div>
      ) : null}

      {!shouldHoldCards ? (
        <div className="grid w-full min-w-0 max-w-full gap-4 max-lg:hidden md:grid-cols-2 xl:grid-cols-3">
          {visibleCards.map((card) => (
            <PremiumPlanCard
              key={card.key}
              card={card}
              highlighted={Boolean(card.paidPlan)}
              busyPlan={busyPlan}
              onCheckout={startCheckout}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
