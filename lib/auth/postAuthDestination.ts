const STORAGE_KEY = "pitchrusch_post_auth_destination";

function isSafeAppPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

/** Remember where to send the user after login / email confirm (e.g. club partnership). */
export function rememberPostAuthDestination(path: string): void {
  if (typeof window === "undefined") return;
  const trimmed = path.trim();
  if (!isSafeAppPath(trimmed)) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    /* ignore */
  }
}

/** Read and clear a stored post-auth path, or return `fallback`. */
export function consumePostAuthDestination(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)?.trim() || "";
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (isSafeAppPath(raw)) return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}
