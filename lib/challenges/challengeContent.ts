import type { ChallengeRow } from "@/lib/challenges/challengeRowUtils";

const SPRINT_20M_SLUG = "sprint-20m-challenge";

type TFn = (key: string) => string;

type LocalizedFields = Partial<{
  title: string;
  description: string;
  instructions: string;
  rules: string;
  badge: string;
  reward_title: string;
  reward_detail: string;
  reward: string;
}>;

function pickLocaleFields(challenge: ChallengeRow, locale: string): LocalizedFields {
  const root = challenge.translations;
  if (!root || typeof root !== "object" || Array.isArray(root)) return {};
  const rec = root as Record<string, unknown>;
  const branch = rec[locale];
  if (!branch || typeof branch !== "object" || Array.isArray(branch)) return {};
  const o = branch as Record<string, unknown>;
  const out: LocalizedFields = {};
  if (typeof o.title === "string" && o.title.trim()) out.title = o.title.trim();
  if (typeof o.description === "string" && o.description.trim()) {
    out.description = o.description.trim();
  }
  if (typeof o.instructions === "string" && o.instructions.trim()) {
    out.instructions = o.instructions.trim();
  }
  if (typeof o.rules === "string" && o.rules.trim()) out.rules = o.rules.trim();
  if (typeof o.badge === "string" && o.badge.trim()) out.badge = o.badge.trim();
  if (typeof o.reward_title === "string" && o.reward_title.trim()) {
    out.reward_title = o.reward_title.trim();
  }
  if (typeof o.reward_detail === "string" && o.reward_detail.trim()) {
    out.reward_detail = o.reward_detail.trim();
  }
  if (typeof o.reward === "string" && o.reward.trim()) out.reward = o.reward.trim();
  return out;
}

export function withLocalizedChallengeContent(
  challenge: ChallengeRow,
  t: TFn,
  locale: string,
): ChallengeRow {
  let base = challenge;
  if (challenge.slug === SPRINT_20M_SLUG) {
    base = {
      ...challenge,
      title: t("sprint20m.title"),
      description: t("sprint20m.description"),
      rules: t("sprint20m.rules"),
      reward_title: t("sprint20m.badgeTitle"),
      reward_detail: t("sprint20m.badgeDetail"),
      reward: `${t("sprint20m.badgeTitle")} — ${t("sprint20m.badgeDetail")}`,
    };
  }
  const localized = pickLocaleFields(base, locale);
  if (Object.keys(localized).length === 0) return base;
  return {
    ...base,
    ...localized,
    badge: localized.badge ?? base.badge,
  };
}

