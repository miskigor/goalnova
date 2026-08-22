/** Tab-scoped: survives refresh in the same tab, cleared when the tab/session ends. */
export const FRESH_LOGIN_STORAGE_KEY = "pitchrusch_fresh_login";
/** Survives webviews that drop sessionStorage on `location.assign`. */
export const FRESH_LOGIN_AT_KEY = "pitchrusch_fresh_login_at";
const FRESH_LOGIN_TTL_MS = 10 * 60 * 1000;

export function hasFreshLogin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(FRESH_LOGIN_STORAGE_KEY) === "1") return true;
  } catch {
    // ignore quota / private mode
  }
  try {
    const at = Number(window.localStorage.getItem(FRESH_LOGIN_AT_KEY));
    return Number.isFinite(at) && Date.now() - at < FRESH_LOGIN_TTL_MS;
  } catch {
    return false;
  }
}

export function setFreshLogin(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FRESH_LOGIN_STORAGE_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
  try {
    window.localStorage.setItem(FRESH_LOGIN_AT_KEY, String(Date.now()));
  } catch {
    // ignore quota / private mode
  }
}

export function clearFreshLogin(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(FRESH_LOGIN_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    window.localStorage.removeItem(FRESH_LOGIN_AT_KEY);
  } catch {
    // ignore
  }
}
