import type { AppRole } from "@/lib/onboarding/roleOnboarding";

export type PendingSignupRole = AppRole | "club";

const KEY = "pitchrusch_pending_signup_role";

export function rememberPendingSignupRole(role: PendingSignupRole): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, role);
  } catch {
    /* ignore */
  }
}

export function peekPendingSignupRole(): PendingSignupRole | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(KEY);
    return v === "player" || v === "scout" || v === "club" ? v : null;
  } catch {
    return null;
  }
}

export function clearPendingSignupRole(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
