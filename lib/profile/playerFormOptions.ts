/**
 * Canonical values stored in `player_profiles.preferred_foot` and `position`
 * (English labels for presets; custom positions stay as free text in `position`).
 */

export const PLAYER_FOOT_VALUES = ["Right", "Left", "Both"] as const;
export type PlayerFootValue = (typeof PLAYER_FOOT_VALUES)[number];

export const PLAYER_POSITION_PRESETS = [
  "Goalkeeper",
  "Centre Back",
  "Left Back",
  "Right Back",
  "Defensive Midfielder",
  "Central Midfielder",
  "Attacking Midfielder",
  "Left Winger",
  "Right Winger",
  "Striker",
] as const;

/** `profileEditor` translation keys for each preset (next-intl). */
export const POSITION_OPTION_KEYS: Record<
  (typeof PLAYER_POSITION_PRESETS)[number],
  string
> = {
  Goalkeeper: "positionGoalkeeper",
  "Centre Back": "positionCentreBack",
  "Left Back": "positionLeftBack",
  "Right Back": "positionRightBack",
  "Defensive Midfielder": "positionDefensiveMidfielder",
  "Central Midfielder": "positionCentralMidfielder",
  "Attacking Midfielder": "positionAttackingMidfielder",
  "Left Winger": "positionLeftWinger",
  "Right Winger": "positionRightWinger",
  Striker: "positionStriker",
};

/** Select value when saving a custom position to `position`. */
export const POSITION_OTHER_VALUE = "__other__";

export const AGE_MIN = 6;
export const AGE_MAX = 45;
export const HEIGHT_MIN_CM = 120;
export const HEIGHT_MAX_CM = 230;
export const WEIGHT_MIN_KG = 30;
export const WEIGHT_MAX_KG = 150;

export function normalizePreferredFootFromDb(raw: string | null | undefined): string {
  const v = raw?.trim();
  if (!v) return "";
  const lower = v.toLowerCase();
  for (const x of PLAYER_FOOT_VALUES) {
    if (x.toLowerCase() === lower) return x;
  }
  if (lower === "r" || /^right\b/.test(lower)) return "Right";
  if (lower === "l" || /^left\b/.test(lower)) return "Left";
  if (/^both\b|^ambi/i.test(lower)) return "Both";
  return "";
}

export function parsePositionFromDb(raw: string | null | undefined): {
  preset: string;
  otherText: string;
} {
  const v = raw?.trim();
  if (!v) return { preset: "", otherText: "" };
  for (const p of PLAYER_POSITION_PRESETS) {
    if (p.toLowerCase() === v.toLowerCase()) return { preset: p, otherText: "" };
  }
  return { preset: POSITION_OTHER_VALUE, otherText: v };
}

export function clampAgeSelect(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  const a = Math.round(Number(n));
  if (a < AGE_MIN || a > AGE_MAX) return "";
  return String(a);
}

export function clampHeightSelect(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  const h = Math.round(Number(n));
  if (h < HEIGHT_MIN_CM || h > HEIGHT_MAX_CM) return "";
  return String(h);
}

export function clampWeightSelect(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  const w = Math.round(Number(n));
  if (w < WEIGHT_MIN_KG || w > WEIGHT_MAX_KG) return "";
  return String(w);
}

export const AGE_OPTIONS: readonly number[] = Array.from(
  { length: AGE_MAX - AGE_MIN + 1 },
  (_, i) => AGE_MIN + i,
);

export const HEIGHT_OPTIONS_CM: readonly number[] = Array.from(
  { length: HEIGHT_MAX_CM - HEIGHT_MIN_CM + 1 },
  (_, i) => HEIGHT_MIN_CM + i,
);

export const WEIGHT_OPTIONS_KG: readonly number[] = Array.from(
  { length: WEIGHT_MAX_KG - WEIGHT_MIN_KG + 1 },
  (_, i) => WEIGHT_MIN_KG + i,
);
