const ROLE_COMPLETE_CACHE_KEY = "pitchrusch_role_onboarding_complete_user";

/** Skip slow role DB check when we already verified onboarding this tab session. */
export function readCachedRoleOnboardingComplete(
  userId: string | null | undefined,
): boolean {
  const id = userId?.trim();
  if (!id || typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ROLE_COMPLETE_CACHE_KEY) === id;
  } catch {
    return false;
  }
}

export function writeCachedRoleOnboardingComplete(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ROLE_COMPLETE_CACHE_KEY, userId.trim());
  } catch {
    // ignore quota / private mode
  }
}

export function clearCachedRoleOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ROLE_COMPLETE_CACHE_KEY);
  } catch {
    // ignore
  }
}
