import {
  PLAYER_POSITION_PRESETS,
  POSITION_OPTION_KEYS,
} from "@/lib/profile/playerFormOptions";

/** Broad English labels stored in DB or entered as free text. */
const GENERIC_POSITION_LABEL_KEYS: Record<string, string> = {
  goalkeeper: "positionGoalkeeper",
  golman: "positionGoalkeeper",
  keeper: "positionGoalkeeper",
  defender: "positionDefender",
  defence: "positionDefender",
  defense: "positionDefender",
  branič: "positionDefender",
  midfielder: "positionMidfielder",
  midfilder: "positionMidfielder",
  vezni: "positionMidfielder",
  forward: "positionForward",
  napadač: "positionForward",
  attacker: "positionForward",
  striker: "positionStriker",
  "left winger": "positionLeftWinger",
  "right winger": "positionRightWinger",
  "left wing": "positionLeftWinger",
  "right wing": "positionRightWinger",
  lw: "positionLeftWinger",
  rw: "positionRightWinger",
  cm: "positionCentralMidfielder",
  cb: "positionCentreBack",
  lb: "positionLeftBack",
  rb: "positionRightBack",
  dm: "positionDefensiveMidfielder",
  am: "positionAttackingMidfielder",
  gk: "positionGoalkeeper",
};

function normalizePositionToken(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Human-readable position for scout dashboards and cards — uses profileEditor keys when possible.
 */
export function formatPlayerPositionLabel(
  raw: string | null | undefined,
  t: (key: string) => string,
  fallback = "—",
): string {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;

  for (const preset of PLAYER_POSITION_PRESETS) {
    if (preset.toLowerCase() === trimmed.toLowerCase()) {
      return t(POSITION_OPTION_KEYS[preset]);
    }
  }

  const genericKey = GENERIC_POSITION_LABEL_KEYS[normalizePositionToken(trimmed)];
  if (genericKey) {
    try {
      return t(genericKey);
    } catch {
      /* key missing in locale — fall through */
    }
  }

  if (/^[a-z\s-/]+$/i.test(trimmed)) {
    return titleCaseWords(trimmed.replace(/-/g, " "));
  }

  return trimmed;
}
