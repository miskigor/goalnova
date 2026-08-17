export type PlayerSubscriptionPlan = "free" | "player_premium" | "scout_pro" | "club";
export type PlayerSubscriptionStatus =
  | "inactive"
  | "active"
  | "canceled"
  | "past_due"
  | "unpaid";

export type PremiumLikeProfile = {
  subscription_plan?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  ai_overall_score?: number | null;
  profile_completeness?: number | null;
  /** Referral reward: treat like featured in discovery ordering until this instant. */
  featured_player_until?: string | null;
};

export type PremiumLikeVideo = {
  is_featured?: boolean | null;
  created_at?: string | null;
  visibility_boost?: number | null;
};

/** Source of truth for free-tier upload cap (must match billing.freePlayer.f2 copy). */
export const FREE_PLAYER_MAX_VIDEOS_TOTAL = 3;
/** Premium and club members: no video cap. */
export const PLAYER_PREMIUM_MAX_VIDEOS_TOTAL = Number.POSITIVE_INFINITY;

import { hasPermanentPremiumAccess } from "@/lib/admin/bootstrapAdminEmails";

export function isPlayerPremium(
  profile: PremiumLikeProfile | null | undefined,
  email?: string | null,
): boolean {
  if (hasPermanentPremiumAccess(email)) return true;
  if (!profile) return false;
  if (String(profile.subscription_plan ?? "").trim() !== "player_premium") return false;
  if (String(profile.subscription_status ?? "").trim() !== "active") return false;
  const endRaw = profile.subscription_current_period_end?.trim();
  if (endRaw) {
    const endMs = new Date(endRaw).getTime();
    if (Number.isFinite(endMs) && endMs <= Date.now()) return false;
  }
  return true;
}

export function isPlayer(profileRole: string | null | undefined): boolean {
  return String(profileRole ?? "").trim() === "player";
}

export function getPlayerVisibilityBoost(profile: PremiumLikeProfile | null | undefined): number {
  if (!profile) return 0;
  return isPlayerPremium(profile) ? 1 : 0;
}

export function canUploadVideo(
  profile: PremiumLikeProfile | null | undefined,
  currentVideoCount: number,
): boolean {
  if (isPlayerPremium(profile)) return true;
  return currentVideoCount < FREE_PLAYER_MAX_VIDEOS_TOTAL;
}

export function getPlayerVideoUploadLimit(profile: PremiumLikeProfile | null | undefined): number {
  return isPlayerPremium(profile) ? PLAYER_PREMIUM_MAX_VIDEOS_TOTAL : FREE_PLAYER_MAX_VIDEOS_TOTAL;
}

export function canSetFeaturedVideo(profile: PremiumLikeProfile | null | undefined): boolean {
  return isPlayerPremium(profile);
}

export function canViewPlayerStats(profile: PremiumLikeProfile | null | undefined): boolean {
  return isPlayerPremium(profile);
}

export function canUseProfileHighlight(profile: PremiumLikeProfile | null | undefined): boolean {
  return isPlayerPremium(profile);
}

export function canUseAchievements(profile: PremiumLikeProfile | null | undefined): boolean {
  return isPlayerPremium(profile);
}

function ts(value: string | null | undefined): number {
  const n = new Date(value ?? 0).getTime();
  return Number.isFinite(n) ? n : 0;
}

export function isFeaturedPlayerBoostActive(
  profile: PremiumLikeProfile | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  return ts(profile?.featured_player_until) > nowMs;
}

function effectiveFeaturedForSort(
  profile: PremiumLikeProfile | null | undefined,
  video: PremiumLikeVideo,
  nowMs: number,
): number {
  if (video.is_featured === true) return 1;
  if (isFeaturedPlayerBoostActive(profile, nowMs)) return 1;
  return 0;
}

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : -1;
}

export function sortVideosForScouts<T extends { profile?: PremiumLikeProfile | null; video: PremiumLikeVideo }>(
  rows: T[],
): T[] {
  const nowMs = Date.now();
  return [...rows].sort((a, b) => {
    const pa = getPlayerVisibilityBoost(a.profile);
    const pb = getPlayerVisibilityBoost(b.profile);
    if (pb !== pa) return pb - pa;
    const fa = effectiveFeaturedForSort(a.profile, a.video, nowMs);
    const fb = effectiveFeaturedForSort(b.profile, b.video, nowMs);
    if (fb !== fa) return fb - fa;
    const aa = num(a.profile?.ai_overall_score);
    const ab = num(b.profile?.ai_overall_score);
    if (ab !== aa) return ab - aa;
    const ca = num(a.profile?.profile_completeness);
    const cb = num(b.profile?.profile_completeness);
    if (cb !== ca) return cb - ca;
    return ts(b.video.created_at) - ts(a.video.created_at);
  });
}

export function sortPlayersForScouts<T extends PremiumLikeProfile>(rows: T[]): T[] {
  const nowMs = Date.now();
  return [...rows].sort((a, b) => {
    const pa = getPlayerVisibilityBoost(a);
    const pb = getPlayerVisibilityBoost(b);
    if (pb !== pa) return pb - pa;
    const fa = isFeaturedPlayerBoostActive(a, nowMs) ? 1 : 0;
    const fb = isFeaturedPlayerBoostActive(b, nowMs) ? 1 : 0;
    if (fb !== fa) return fb - fa;
    const aa = num(a.ai_overall_score);
    const ab = num(b.ai_overall_score);
    if (ab !== aa) return ab - aa;
    const ca = num(a.profile_completeness);
    const cb = num(b.profile_completeness);
    if (cb !== ca) return cb - ca;
    return 0;
  });
}
