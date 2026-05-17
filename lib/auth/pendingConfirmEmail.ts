const STORAGE_KEY = "gn_pending_confirm_email";

export function rememberPendingConfirmEmail(email: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const trimmed = (email ?? "").trim();
  if (!trimmed.includes("@")) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekPendingConfirmEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    return v && v.includes("@") ? v : null;
  } catch {
    return null;
  }
}

export function clearPendingConfirmEmail(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
