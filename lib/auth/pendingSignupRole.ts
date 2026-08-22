import type { AppRole } from "@/lib/onboarding/roleOnboarding";

export type PendingSignupRole = AppRole | "club";

const KEY = "pitchrusch_pending_signup_role";

function isPendingSignupRole(value: string | null): value is PendingSignupRole {
  return value === "player" || value === "scout" || value === "club";
}

export function rememberPendingSignupRole(role: PendingSignupRole): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, role);
  } catch {
    /* ignore */
  }
  try {
    window.localStorage.setItem(KEY, role);
  } catch {
    /* ignore */
  }
}

export function peekPendingSignupRole(): PendingSignupRole | null {
  if (typeof window === "undefined") return null;
  try {
    const session = window.sessionStorage.getItem(KEY);
    if (isPendingSignupRole(session)) return session;
  } catch {
    /* ignore */
  }
  try {
    const stored = window.localStorage.getItem(KEY);
    if (isPendingSignupRole(stored)) return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPendingSignupRole(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
