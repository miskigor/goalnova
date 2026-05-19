/** Tab-scoped: survives refresh in the same tab, cleared when the tab/session ends. */
export const FRESH_LOGIN_STORAGE_KEY = "pitchrusch_fresh_login";

export function hasFreshLogin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(FRESH_LOGIN_STORAGE_KEY) === "1";
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
}

export function clearFreshLogin(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(FRESH_LOGIN_STORAGE_KEY);
  } catch {
    // ignore
  }
}
