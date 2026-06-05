import { clearFreshLogin } from "@/lib/auth/freshLogin";
import { invalidateGateSessionSnapshot } from "@/lib/auth/gateSessionSnapshot";
import { supabase } from "@/lib/supabase/client";

let recoveryInFlight: Promise<void> | null = null;

function clearSupabaseAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) {
      const ref = new URL(url).hostname.split(".")[0];
      window.localStorage.removeItem(`sb-${ref}-auth-token`);
    }
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore quota / private mode
  }
}

export function isInvalidRefreshTokenError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const message =
    "message" in err && typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message
      : "";
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid refresh token") ||
    lower.includes("refresh token not found")
  ) {
    return true;
  }

  if ("code" in err && typeof (err as { code?: unknown }).code === "string") {
    const code = (err as { code: string }).code.toLowerCase();
    return code === "refresh_token_not_found" || code === "invalid_refresh_token";
  }

  return false;
}

/** Clears broken Supabase auth from browser storage (local sign-out). */
export async function recoverStaleSupabaseSession(): Promise<void> {
  if (typeof window === "undefined") return;

  if (!recoveryInFlight) {
    recoveryInFlight = (async () => {
      clearFreshLogin();
      invalidateGateSessionSnapshot();
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Storage may already be cleared by Supabase after a failed refresh.
      }
      clearSupabaseAuthStorage();
    })().finally(() => {
      recoveryInFlight = null;
    });
  }

  await recoveryInFlight;
}

/** Returns true when the error was a stale refresh token and local recovery ran. */
export async function recoverIfInvalidRefreshToken(err: unknown): Promise<boolean> {
  if (!isInvalidRefreshTokenError(err)) return false;
  await recoverStaleSupabaseSession();
  return true;
}
