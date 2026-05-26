/** True when Supabase auth token is present in browser storage (survives brief auth init gaps). */
export function hasPersistedSupabaseSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return false;
    const ref = new URL(url).hostname.split(".")[0];
    const primaryKey = `sb-${ref}-auth-token`;
    const primary = window.localStorage.getItem(primaryKey);
    if (sessionTokenValid(primary)) return true;

    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      if (sessionTokenValid(window.localStorage.getItem(key))) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function sessionTokenValid(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { access_token?: string };
    return (
      typeof parsed?.access_token === "string" && parsed.access_token.length > 0
    );
  } catch {
    return false;
  }
}
