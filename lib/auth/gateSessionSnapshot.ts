import { devError } from "@/lib/devLog";
import { supabase } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type GateSessionSnapshot = {
  session: Session | null;
  user: User | null;
};

const GATE_SESSION_TIMEOUT_MS = 10_000;
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

function writeCache(snapshot: GateSessionSnapshot): GateSessionSnapshot {
  cachedSnapshot = snapshot;
  cachedAt = Date.now();
  return snapshot;
}

function snapshotFromSession(session: Session | null): GateSessionSnapshot {
  return { session, user: session?.user ?? null };
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

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async (): Promise<GateSessionSnapshot> => {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<"timeout">((resolve) => {
        window.setTimeout(() => resolve("timeout"), GATE_SESSION_TIMEOUT_MS);
      }),
    ]);

    if (result !== "timeout") {
      const session = result.data.session ?? null;
      return writeCache(snapshotFromSession(session));
    }

    devError(
      `${gateLabel}: getSession did not resolve within ${GATE_SESSION_TIMEOUT_MS}ms; falling back to getUser`,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
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
