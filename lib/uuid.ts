import { nanoid } from "nanoid";

/** Loose UUID check for route params (any RFC 4122 variant). */
export const LOOSE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLooseUuid(value: string): boolean {
  return LOOSE_UUID_RE.test(value.trim());
}

/** Compare auth / DB ids case-insensitively (avoids strict `===` misses across sources). */
export function uuidsEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Unique id for client-only state (optimistic messages, temp keys).
 * Prefers `globalThis.crypto.randomUUID()` when present; otherwise `nanoid()` so ids stay
 * compact and collision-resistant where `randomUUID` is missing (some WebViews, older browsers).
 */
export function generateClientId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return nanoid();
}
