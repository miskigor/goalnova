"use client";

import { useTranslations } from "next-intl";
import type { PaidSubscriptionPlan } from "@/lib/stripe/plans";

export type PremiumPlanCardModel = {
  key: "freePlayer" | "playerPremium" | "freeScout" | "scoutPro" | "club";
  paidPlan?: PaidSubscriptionPlan;
  priceKey: string;
  featureKeys: string[];
  audience: "player" | "scout";
};

type PremiumPlanCardProps = {
  card: PremiumPlanCardModel;
  compact?: boolean;
  /** Slightly larger compact card (mobile stacked player plans). */
  enlarged?: boolean;
  highlighted?: boolean;
  hideActions?: boolean;
  busyPlan: PaidSubscriptionPlan | null;
  onCheckout: (plan: PaidSubscriptionPlan) => void;
};

function FeatureCheckIcon({ large = false }: { large?: boolean }) {
  return (
    <span
      className={[
        "flex shrink-0 items-center justify-center rounded-full bg-gn-accent/15 text-gn-accent",
        large ? "size-5" : "size-4",
      ].join(" ")}
      aria-hidden
    >
      <svg
        viewBox="0 0 12 12"
        className={large ? "size-3" : "size-2.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M2 6.5 4.5 9 10 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

const COMPACT_ACTION_BTN =
  "w-full shrink-0 rounded-xl px-2 py-2 text-[11px] font-semibold leading-tight";

export function PremiumPlanCard({
  card,
  compact = false,
  enlarged = false,
  highlighted = false,
  hideActions = false,
  busyPlan,
  onCheckout,
}: PremiumPlanCardProps) {
  const t = useTranslations("billing");
  const showDescription =
    !compact && (card.key === "playerPremium" || card.key === "scoutPro");

  return (
    <article
      className={[
        "box-border flex min-w-0 max-w-full flex-col rounded-2xl border bg-gn-surface/35 p-5",
        compact ? (enlarged ? "rounded-xl p-3.5" : "rounded-xl p-2.5") : "min-h-0 overflow-hidden",
        highlighted
          ? compact
            ? "border-gn-accent/55 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.35)]"
            : "border-gn-accent/50 ring-1 ring-gn-accent/35 shadow-[0_0_24px_rgba(249,115,22,0.12)]"
          : "border-gn-border-subtle",
      ].join(" ")}
    >
      <h2
        className={[
          "break-words font-semibold text-gn-text",
          compact ? (enlarged ? "text-base leading-tight" : "text-sm leading-tight") : "text-lg",
        ].join(" ")}
      >
        {t(`${card.key}.title`)}
      </h2>
      {showDescription ? (
        <p className="mt-2 text-sm text-gn-text-secondary">{t(`${card.key}.description`)}</p>
      ) : null}
      <p
        className={[
          "font-medium text-gn-text",
          compact ? (enlarged ? "mt-1.5 text-sm" : "mt-1 text-xs") : "mt-1 text-sm",
          highlighted ? "text-gn-accent" : "",
        ].join(" ")}
      >
        {t(card.priceKey)}
      </p>
      <ul
        className={[
          "text-gn-text-secondary",
          compact
            ? enlarged
              ? "mt-2 space-y-1.5"
              : "mt-1.5 space-y-1"
            : "mt-4 min-h-0 flex-1 list-disc space-y-1.5 ps-5 text-sm",
        ].join(" ")}
      >
        {card.featureKeys.map((f) => (
          <li
            key={f}
            className={
              compact
                ? enlarged
                  ? "flex items-start gap-2.5 text-sm leading-snug"
                  : "flex items-start gap-2 text-xs leading-snug"
                : "break-words"
            }
          >
            {compact ? <FeatureCheckIcon large={enlarged} /> : null}
            <span className="min-w-0 flex-1 break-words">
              {compact ? t(`${card.key}.${f}Short`) : t(`${card.key}.${f}`)}
            </span>
          </li>
        ))}
      </ul>
      {!hideActions ? (
        card.paidPlan ? (
          <button
            type="button"
            onClick={() => onCheckout(card.paidPlan!)}
            disabled={busyPlan === card.paidPlan}
            className={[
              "mt-4 bg-gn-accent text-black disabled:opacity-55",
              compact ? `mt-2 ${COMPACT_ACTION_BTN}` : "w-full shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold",
            ].join(" ")}
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
            className={[
              "mt-4 border border-gn-border-subtle bg-gn-surface/50 font-semibold text-gn-text-secondary",
              compact ? `mt-2 ${COMPACT_ACTION_BTN}` : "w-full shrink-0 rounded-xl px-4 py-2.5 text-xs",
            ].join(" ")}
          >
            {t("currentFree")}
          </button>
        )
      ) : null}
    </article>
  );
}
