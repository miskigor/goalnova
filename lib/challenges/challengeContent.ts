import type { ChallengeRow } from "@/lib/challenges/challengeRowUtils";

const SPRINT_20M_SLUG = "sprint-20m-challenge";
const KEEPY_UPS_SLUG = "keepy-ups-challenge";
const DRIBBLING_SLALOM_SLUG = "dribbling-slalom-challenge";
const WEAK_FOOT_PASS_SLUG = "weak-foot-pass-challenge";
const CROSSBAR_SLUG = "crossbar-challenge";

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
      ...withoutDbRuleFragments(challenge),
      title: t("sprint20m.title"),
      description: t("sprint20m.description"),
      instructions: null,
      rules: t("sprint20m.rules"),
      badge: t("sprint20m.badgeName"),
      reward_title: t("sprint20m.badgeTitle"),
      reward_detail: t("sprint20m.badgeDetail"),
      reward: `${t("sprint20m.badgeTitle")} — ${t("sprint20m.badgeDetail")}`,
    };
  } else if (challenge.slug === KEEPY_UPS_SLUG) {
    base = {
      ...withoutDbRuleFragments(challenge),
      title: t("keepyUps.title"),
      description: t("keepyUps.description"),
      instructions: null,
      rules: t("keepyUps.rules"),
      reward_title: t("keepyUps.badgeTitle"),
      reward_detail: t("keepyUps.badgeDetail"),
      reward: `${t("keepyUps.badgeTitle")} — ${t("keepyUps.badgeDetail")}`,
    };
  } else if (challenge.slug === DRIBBLING_SLALOM_SLUG) {
    base = {
      ...withoutDbRuleFragments(challenge),
      title: t("dribblingSlalom.title"),
      description: t("dribblingSlalom.description"),
      instructions: t("dribblingSlalom.instructions"),
      equipment: linesToEquipmentList(t("dribblingSlalom.equipment")),
      rules: t("dribblingSlalom.rules"),
      badge: t("dribblingSlalom.badgeName"),
      reward_title: t("dribblingSlalom.badgeTitle"),
      reward_detail: t("dribblingSlalom.badgeDetail"),
      reward: `${t("dribblingSlalom.badgeTitle")} — ${t("dribblingSlalom.badgeDetail")}`,
    };
  } else if (challenge.slug === WEAK_FOOT_PASS_SLUG) {
    base = {
      ...withoutDbRuleFragments(challenge),
      title: t("weakFootPass.title"),
      description: t("weakFootPass.description"),
      instructions: t("weakFootPass.instructions"),
      equipment: linesToEquipmentList(t("weakFootPass.equipment")),
      rules: t("weakFootPass.rules"),
      badge: t("weakFootPass.badgeName"),
      reward_title: t("weakFootPass.badgeTitle"),
      reward_detail: t("weakFootPass.badgeDetail"),
      reward: `${t("weakFootPass.badgeTitle")} — ${t("weakFootPass.badgeDetail")}`,
    };
  } else if (challenge.slug === CROSSBAR_SLUG) {
    base = {
      ...withoutDbRuleFragments(challenge),
      title: t("crossbar.title"),
      description: t("crossbar.description"),
      instructions: t("crossbar.instructions"),
      equipment: linesToEquipmentList(t("crossbar.equipment")),
      rules: t("crossbar.rules"),
      badge: t("crossbar.badgeName"),
      reward_title: t("crossbar.badgeTitle"),
      reward_detail: t("crossbar.badgeDetail"),
      reward: `${t("crossbar.badgeTitle")} — ${t("crossbar.badgeDetail")}`,
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

