import {
  normalizeSubscriptionPlan,
  normalizeSubscriptionStatus,
} from "@/lib/stripe/plans";

export type SubscriptionLikeProfile = {
  subscription_plan?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
};

function subscriptionPeriodEndMs(
  profile: SubscriptionLikeProfile | null | undefined,
): number | null {
  const raw = profile?.subscription_current_period_end?.trim();
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isSubscriptionActive(profile: SubscriptionLikeProfile | null | undefined): boolean {
  if (!profile) return false;
  if (normalizeSubscriptionStatus(profile.subscription_status) !== "active") return false;
  const endMs = subscriptionPeriodEndMs(profile);
  if (endMs !== null && endMs <= Date.now()) return false;
  return true;
}

export function isPlayerPremium(profile: SubscriptionLikeProfile | null | undefined): boolean {
  if (!profile) return false;
  return (
    normalizeSubscriptionPlan(profile.subscription_plan) === "player_premium" &&
    isSubscriptionActive(profile)
  );
}

export function isScoutPro(profile: SubscriptionLikeProfile | null | undefined): boolean {
  if (!profile) return false;
  return (
    normalizeSubscriptionPlan(profile.subscription_plan) === "scout_pro" &&
    isSubscriptionActive(profile)
  );
}

export function isClubPlan(profile: SubscriptionLikeProfile | null | undefined): boolean {
  if (!profile) return false;
  return normalizeSubscriptionPlan(profile.subscription_plan) === "club" && isSubscriptionActive(profile);
}

export function canUsePlayerPremium(profile: SubscriptionLikeProfile | null | undefined): boolean {
  return isPlayerPremium(profile);
}

export function canUseScoutPro(profile: SubscriptionLikeProfile | null | undefined): boolean {
  return isScoutPro(profile) || isClubPlan(profile);
}

export function canUseClubFeatures(profile: SubscriptionLikeProfile | null | undefined): boolean {
  return isClubPlan(profile);
}

