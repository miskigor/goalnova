/**
 * Stable `/player/[segment]` segment for in-app links.
 * Prefer auth user id — username lookup is exact-match only and can 404 on drift.
 */
export function buildPlayerProfilePathSegment(
  userId: string | null | undefined,
  _username?: string | null,
): string | null {
  const uid = typeof userId === "string" ? userId.trim() : "";
  return uid || null;
}

export function buildPlayerProfilePath(
  userId: string | null | undefined,
  username?: string | null,
): `/player/${string}` | null {
  const segment = buildPlayerProfilePathSegment(userId, username);
  if (!segment) return null;
  return `/player/${encodeURIComponent(segment)}`;
}
