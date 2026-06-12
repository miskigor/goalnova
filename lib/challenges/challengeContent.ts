import type { ChallengeRow } from "@/lib/challenges/challengeRowUtils";

const SPRINT_20M_SLUG = "sprint-20m-challenge";
const KEEPY_UPS_SLUG = "keepy-ups-challenge";
const DRIBBLING_SLALOM_SLUG = "dribbling-slalom-challenge";
const WEAK_FOOT_PASS_SLUG = "weak-foot-pass-challenge";
const CROSSBAR_SLUG = "crossbar-challenge";
const FREESTYLE_SLUG = "freestyle-challenge";

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

type ChallengeI18nConfig = {
  prefix: string;
  instructions?: boolean;
  equipment?: boolean;
  badge?: boolean;
};

const CHALLENGE_I18N: Record<string, ChallengeI18nConfig> = {
  [SPRINT_20M_SLUG]: { prefix: "sprint20m", badge: true },
  [KEEPY_UPS_SLUG]: { prefix: "keepyUps", badge: true },
  [DRIBBLING_SLALOM_SLUG]: {
    prefix: "dribblingSlalom",
    instructions: true,
    equipment: true,
    badge: true,
  },
  [WEAK_FOOT_PASS_SLUG]: {
    prefix: "weakFootPass",
    instructions: true,
    equipment: true,
    badge: true,
  },
  [CROSSBAR_SLUG]: {
    prefix: "crossbar",
    instructions: true,
    equipment: true,
    badge: true,
  },
  [FREESTYLE_SLUG]: {
    prefix: "freestyle",
    instructions: true,
    equipment: true,
    badge: true,
  },
};

function linesToEquipmentList(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter((line) => line.length > 0);
}

/** Drop English DB fragments when i18n provides the full rules block. */
function withoutDbRuleFragments(challenge: ChallengeRow): ChallengeRow {
  return {
    ...challenge,
    rules_json: [],
    scoring: null,
    equipment: [],
  };
}

function applyChallengeI18n(
  challenge: ChallengeRow,
  t: TFn,
  config: ChallengeI18nConfig,
): ChallengeRow {
  const p = config.prefix;
  return {
    ...withoutDbRuleFragments(challenge),
    title: t(`${p}.title`),
    description: t(`${p}.description`),
    instructions: config.instructions ? t(`${p}.instructions`) : null,
    equipment: config.equipment
      ? linesToEquipmentList(t(`${p}.equipment`))
      : [],
    rules: t(`${p}.rules`),
    badge: config.badge ? t(`${p}.badgeName`) : challenge.badge,
    reward_title: t(`${p}.badgeTitle`),
    reward_detail: t(`${p}.badgeDetail`),
    reward: `${t(`${p}.badgeTitle`)} — ${t(`${p}.badgeDetail`)}`,
  };
}

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
  const config = CHALLENGE_I18N[challenge.slug];
  let base = config ? applyChallengeI18n(challenge, t, config) : challenge;
  const localized = pickLocaleFields(base, locale);
  if (Object.keys(localized).length === 0) return base;
  return {
    ...base,
    ...localized,
    badge: localized.badge ?? base.badge,
  };
}
