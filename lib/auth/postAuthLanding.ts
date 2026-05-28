/** Per-user: after the first post-sign-in landing on profile, later logins go to /home. */
const STORAGE_PREFIX = "pitchrusch_post_auth_profile_landing_done_";

export function hasCompletedPostAuthProfileLanding(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

export function markPostAuthProfileLandingComplete(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, "1");
  } catch {
    // ignore quota / private mode
  }
}
