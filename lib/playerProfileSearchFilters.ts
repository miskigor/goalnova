export type PlayerProfileExtraFilters = {
  position: string;
  country: string;
  city: string;
  ageMinStr: string;
  ageMaxStr: string;
  preferredFoot: string;
  club: string;
};

export const EMPTY_PLAYER_PROFILE_EXTRA: PlayerProfileExtraFilters = {
  position: "",
  country: "",
  city: "",
  ageMinStr: "",
  ageMaxStr: "",
  preferredFoot: "",
  club: "",
};

export function parseAgeInput(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 && n <= 120 ? n : null;
}
