import type { Session, User } from "@supabase/supabase-js";

function supabaseAuthStorageKey(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const ref = new URL(url).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

export function normalizeSessionForStorage(
  session: Session,
  user?: User | null,
): Session {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt =
    typeof session.expires_at === "number" && session.expires_at > 0
      ? session.expires_at
      : typeof session.expires_in === "number" && session.expires_in > 0
        ? now + session.expires_in
        : now + 3600;

  const resolvedUser = user ?? session.user ?? null;

  return {
    ...session,
    expires_at: expiresAt,
    expires_in:
      typeof session.expires_in === "number" && session.expires_in > 0
        ? session.expires_in
        : Math.max(expiresAt - now, 0),
    token_type: session.token_type ?? "bearer",
    user: resolvedUser,
  };
}

/**
 * Writes Supabase auth session to localStorage (same shape as @supabase/supabase-js).
 * Used when `auth.setSession()` hangs in in-app browsers (Instagram, etc.).
 */
export function persistSupabaseSession(session: Session): boolean {
  if (typeof window === "undefined") return false;

  const storageKey = supabaseAuthStorageKey();
  if (!storageKey || !session.access_token || !session.refresh_token) {
    return false;
  }

  try {
    const normalized = normalizeSessionForStorage(session);
    const payload: Record<string, unknown> = {
      access_token: normalized.access_token,
      refresh_token: normalized.refresh_token,
      expires_at: normalized.expires_at,
      expires_in: normalized.expires_in,
      token_type: normalized.token_type,
      user: normalized.user ?? null,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    if (normalized.user) {
      window.localStorage.setItem(
        `${storageKey}-user`,
        JSON.stringify({ user: normalized.user }),
      );
    }
    return true;
  } catch {
    return false;
  }
}
