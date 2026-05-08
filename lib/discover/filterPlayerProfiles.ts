import type { PlayerProfileRow } from "@/lib/supabase/discoverPlayers";

export type DiscoverClientFilters = {
  search: string;
  country: string;
  city: string;
  ageMin: number | null;
  ageMax: number | null;
  position: string;
  preferredFoot: string;
};

function fieldIncludes(
  value: string | null | undefined,
  needle: string
): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  return (value ?? "").toLowerCase().includes(n);
}

/**
 * Client-side filter for the full player list. O(n); keep dataset in memory only when reasonable.
 */
export function filterPlayerProfiles(
  rows: PlayerProfileRow[],
  f: DiscoverClientFilters
): PlayerProfileRow[] {
  const q = f.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (q) {
      const name = (row.full_name ?? "").toLowerCase();
      const user = (row.username ?? "").toLowerCase();
      if (!name.includes(q) && !user.includes(q)) return false;
    }

    if (!fieldIncludes(row.country, f.country)) return false;
    if (!fieldIncludes(row.city, f.city)) return false;
    if (!fieldIncludes(row.position, f.position)) return false;
    if (!fieldIncludes(row.preferred_foot, f.preferredFoot)) return false;

    if (f.ageMin !== null) {
      if (row.age == null || row.age < f.ageMin) return false;
    }
    if (f.ageMax !== null) {
      if (row.age == null || row.age > f.ageMax) return false;
    }

    return true;
  });
}
