import { devError, devWarn } from "@/lib/devLog";
import {
  hasSupabaseAuthStorage,
  recoverIfInvalidRefreshToken,
} from "@/lib/auth/staleSessionRecovery";
import { supabase } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type GateSessionSnapshot = {
  session: Session | null;
  user: User | null;
};

const GATE_SESSION_TIMEOUT_MS = 4_000;
/** Reuse snapshot across EmailConfirmationGate → RoleOnboardingGate on the same cold load. */
const SNAPSHOT_CACHE_TTL_MS = 30_000;

let cachedSnapshot: GateSessionSnapshot | null = null;
let cachedAt = 0;
let inFlight: Promise<GateSessionSnapshot> | null = null;

export function invalidateGateSessionSnapshot(): void {
  cachedSnapshot = null;
  cachedAt = 0;
  inFlight = null;
}

/** After sign-in, warm cache so post-AuthGate guards skip a slow getSession(). */
export function seedGateSessionSnapshot(session: Session | null): void {
  writeCache(snapshotFromSession(session));
}

function writeCache(snapshot: GateSessionSnapshot): GateSessionSnapshot {
  cachedSnapshot = snapshot;
  cachedAt = Date.now();
  return snapshot;
}

function snapshotFromSession(session: Session | null): GateSessionSnapshot {
  return { session, user: session?.user ?? null };
}

/**
 * Synchronous session read from memory cache or localStorage — no await on auth init.
 * Use for instant shell render on repeat visits.
 */
export function readSyncGateSessionSnapshot(): GateSessionSnapshot {
  const now = Date.now();
  if (cachedSnapshot && now - cachedAt < SNAPSHOT_CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  const persistedSession = readPersistedSessionFromStorage();
  if (persistedSession) {
    const user =
      persistedSession.user ??
      readPersistedUserFromStorage(supabaseStorageKey() ?? "") ??
      null;
    return writeCache({
      session: persistedSession,
      user,
    });
  }

  return { session: null, user: null };
}

function supabaseStorageKey(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const ref = new URL(url).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

function isSessionTokenRecord(
  value: unknown,
): value is Omit<Session, "user"> & { user?: User } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.access_token === "string" &&
    record.access_token.length > 0 &&
    typeof record.refresh_token === "string" &&
    typeof record.expires_at === "number"
  );
}

function readPersistedUserFromStorage(storageKey: string): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${storageKey}-user`);
    if (!raw || raw === "null") return null;
    const parsed = JSON.parse(raw) as { user?: User } | User | null;
    if (
      parsed &&
      typeof parsed === "object" &&
      "user" in parsed &&
      parsed.user?.id
    ) {
      return parsed.user;
    }
    if (parsed && typeof parsed === "object" && "id" in parsed && parsed.id) {
      return parsed as User;
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}

/** Read Supabase session from localStorage without awaiting auth init (avoids hung getSession). */
function readPersistedSessionFromStorage(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const storageKey = supabaseStorageKey();
    if (!storageKey) return null;

    let raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key?.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
        raw = window.localStorage.getItem(key);
        if (raw) break;
      }
    }

    if (!raw || raw === "null") return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isSessionTokenRecord(parsed)) return null;

    if (typeof parsed.expires_at === "number" && parsed.expires_at > 0) {
      const expiresAtMs = parsed.expires_at * 1000;
      if (Date.now() >= expiresAtMs - 30_000) {
        return null;
      }
    }

    const user = parsed.user ?? readPersistedUserFromStorage(storageKey);
    return user ? ({ ...parsed, user } as Session) : ({ ...parsed } as Session);
  } catch {
    return null;
  }
}

/**
 * Session read shared by post-AuthGate guards. Caches for a short TTL so sequential
 * gates on first load do not each await a separate `getSession()`.
 */
export async function readGateSessionSnapshot(
  gateLabel: string,
  options?: { session?: Session | null },
): Promise<GateSessionSnapshot> {
  if (options?.session !== undefined) {
    return writeCache(snapshotFromSession(options.session));
  }

  const now = Date.now();
  if (cachedSnapshot && now - cachedAt < SNAPSHOT_CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  const persistedSession = readPersistedSessionFromStorage();
  if (persistedSession) {
    const user =
      persistedSession.user ??
      readPersistedUserFromStorage(supabaseStorageKey() ?? "") ??
      null;
    return writeCache({
      session: persistedSession,
      user,
    });
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async (): Promise<GateSessionSnapshot> => {
    if (!hasSupabaseAuthStorage()) {
      return writeCache({ session: null, user: null });
    }

    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<"timeout">((resolve) => {
        window.setTimeout(() => resolve("timeout"), GATE_SESSION_TIMEOUT_MS);
      }),
    ]);

    if (result !== "timeout") {
      if (result.error && (await recoverIfInvalidRefreshToken(result.error))) {
        return writeCache({ session: null, user: null });
      }
      const session = result.data.session ?? null;
      return writeCache(snapshotFromSession(session));
    }

    devWarn(
      `${gateLabel}: getSession did not resolve within ${GATE_SESSION_TIMEOUT_MS}ms; falling back to getUser`,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr && (await recoverIfInvalidRefreshToken(userErr))) {
      return writeCache({ session: null, user: null });
    }
    if (userErr) {
      devError(`${gateLabel}: getUser fallback failed`, userErr);
    }
    const user = userData.user ?? null;
    return writeCache({ session: null, user });
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
