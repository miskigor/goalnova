import { FRIEND_CHALLENGE_INVITE_STORAGE_KEY } from "@/lib/friendChallenge/friendChallengeConfig";

const SESSION_KEY = FRIEND_CHALLENGE_INVITE_STORAGE_KEY;

export function rememberFriendChallengeId(challengeId: string | null | undefined): void {
  const id = String(challengeId ?? "").trim();
  if (!id || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, id);
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    /* ignore */
  }
}

export function readPendingFriendChallengeId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      sessionStorage.getItem(SESSION_KEY)?.trim() ||
      localStorage.getItem(SESSION_KEY)?.trim() ||
      null
    );
  } catch {
    return null;
  }
}

export function clearPendingFriendChallengeId(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
