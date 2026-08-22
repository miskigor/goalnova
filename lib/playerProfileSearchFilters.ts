export type PlayerProfileExtraFilters = {
  position: string;
  country: string;
  city: string;
  ageMinStr: string;
  ageMaxStr: string;
  preferredFoot: string;
  club: string;
  availableForTrials: boolean;
  lookingForClub: boolean;
};

export const EMPTY_PLAYER_PROFILE_EXTRA: PlayerProfileExtraFilters = {
  position: "",
  country: "",
  city: "",
  ageMinStr: "",
  ageMaxStr: "",
  preferredFoot: "",
  club: "",
  availableForTrials: false,
  lookingForClub: false,
};

export type PlayerProfileTextFilterKey = Exclude<
  keyof PlayerProfileExtraFilters,
  "availableForTrials" | "lookingForClub"
>;

export function parseAgeInput(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 && n <= 120 ? n : null;
}

export function hasTextPlayerProfileExtraFilters(
  f: PlayerProfileExtraFilters,
): boolean {
  return Boolean(
    f.position.trim() ||
      f.country.trim() ||
      f.city.trim() ||
      f.ageMinStr.trim() ||
      f.ageMaxStr.trim() ||
      f.preferredFoot.trim() ||
      f.club.trim(),
  );
}

export function hasPlayerProfileExtraFilters(
  f: PlayerProfileExtraFilters,
): boolean {
  return (
    hasTextPlayerProfileExtraFilters(f) ||
    f.availableForTrials ||
    f.lookingForClub
  );
}
