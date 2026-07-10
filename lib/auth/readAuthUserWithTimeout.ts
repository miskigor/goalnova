import { readGateSessionSnapshot } from "@/lib/auth/gateSessionSnapshot";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const DEFAULT_GET_USER_MS = 4_000;

/**
 * Resolves the signed-in user without waiting forever on a hung Supabase auth init
 * (common right after signup when `setSession` is still in flight).
 */
export async function readAuthUserWithTimeout(
  label: string,
  timeoutMs = DEFAULT_GET_USER_MS,
): Promise<User | null> {
  const snapshot = await readGateSessionSnapshot(label);
  if (snapshot.user?.id) return snapshot.user;

  const result = await Promise.race([
    supabase.auth.getUser(),
    new Promise<"timeout">((resolve) => {
      window.setTimeout(() => resolve("timeout"), timeoutMs);
    }),
  ]);

  if (result === "timeout") {
    const retry = await readGateSessionSnapshot(`${label}-retry`);
    return retry.user ?? null;
  }

  return result.data.user ?? null;
}
