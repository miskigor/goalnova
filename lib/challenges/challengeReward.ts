import type { ChallengeRow } from "@/lib/challenges/challengeRowUtils";

export const REWARD_TYPES = [
  "gear",
  "digital",
  "cash",
  "feature",
  "recognition",
  "other",
] as const;

export type RewardType = (typeof REWARD_TYPES)[number];

export function normalizeRewardType(
  raw: string | null | undefined,
): RewardType | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase();
  return (REWARD_TYPES as readonly string[]).includes(t) ? (t as RewardType) : null;
}

export function challengeRewardHeadline(ch: ChallengeRow): string | null {
  const rt = ch.reward_title?.trim();
  if (rt) return rt;
  const leg = ch.reward?.trim();
  if (leg) {
    const first = leg.split("\n")[0]?.trim();
    if (first && first.length <= 120) return first;
    return leg.slice(0, 80) + (leg.length > 80 ? "…" : "");
  }
  return null;
}

export function challengeRewardDescription(ch: ChallengeRow): string | null {
  const d = ch.reward_detail?.trim();
  if (d) return d;
  const leg = ch.reward?.trim();
  if (!leg) return null;
  const lines = leg.split("\n");
  if (lines.length > 1) return lines.slice(1).join("\n").trim() || null;
  return null;
}

export function challengeRewardImageUrl(ch: ChallengeRow): string | null {
  const u = ch.reward_image_url?.trim();
  return u && /^https?:\/\//i.test(u) ? u : null;
}
