export const SUBSCRIPTION_PLANS = [
  "free",
  "player_premium",
  "scout_pro",
  "club",
] as const;

export const SUBSCRIPTION_STATUSES = [
  "inactive",
  "active",
  "canceled",
  "past_due",
  "unpaid",
] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];
export type PaidSubscriptionPlan = Exclude<SubscriptionPlan, "free">;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export function isPaidSubscriptionPlan(value: string): value is PaidSubscriptionPlan {
  return value === "player_premium" || value === "scout_pro" || value === "club";
}

export function normalizeSubscriptionPlan(value: string | null | undefined): SubscriptionPlan {
  if (value === "player_premium" || value === "scout_pro" || value === "club") {
    return value;
  }
  return "free";
}

export function normalizeSubscriptionStatus(
  value: string | null | undefined,
): SubscriptionStatus {
  if (
    value === "active" ||
    value === "canceled" ||
    value === "past_due" ||
    value === "unpaid"
  ) {
    return value;
  }
  return "inactive";
}

export function envPriceIdForPlan(plan: PaidSubscriptionPlan): string {
  const pick = (...values: Array<string | undefined>) =>
    values.map((v) => v?.trim() ?? "").find((v) => v.length > 0) ?? "";

  switch (plan) {
    case "player_premium":
      return pick(
        process.env.STRIPE_PLAYER_PREMIUM_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_PLAYER_PREMIUM_PRICE_ID,
      );
    case "scout_pro":
      return pick(
        process.env.STRIPE_SCOUT_PRO_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_SCOUT_PRO_PRICE_ID,
      );
    case "club":
      return pick(
        process.env.STRIPE_CLUB_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_CLUB_PRICE_ID,
      );
  }
}

