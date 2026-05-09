import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Reusable Supabase browser client for:
 * - Auth (signIn, signUp, session, etc.)
 * - Database queries (select/insert/update, RPC, etc.)
 *
 * Note: This uses `NEXT_PUBLIC_*` variables, so it is intended for the browser.
 * Server-side auth requires a different setup (cookies) which we can add later.
 */

// Supabase recommends storing these in environment variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type { Database } from "./database.types";

export function assertSupabaseConfigured() {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Supabase is not configured. Missing env var(s): ${missing.join(", ")}`
    );
  }
}

/**
 * Singleton client instance (safe to reuse).
 *
 * If env vars are missing, requests will fail at runtime; the app will still compile.
 */
/**
 * Default cross-tab `navigator.locks` auth sync has caused stuck `getSession` / INITIAL_SESSION
 * on some mobile Safari builds (single-tab PWA / dev over LAN). In-process lock is enough here.
 */
async function inProcessAuthLock<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  return fn();
}

const browserSessionStorage =
  typeof window !== "undefined" ? window.sessionStorage : undefined;

/**
 * Browser network errors can reject fetch with `TypeError: Failed to fetch`.
 * Converting them to a synthetic HTTP response prevents noisy unhandled promise
 * rejections and lets callers handle the failure through normal Supabase error paths.
 */
async function supabaseSafeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Failed to fetch";
    return new Response(
      JSON.stringify({
        message: `TypeError: ${message}`,
      }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: {
      fetch: supabaseSafeFetch,
    },
    auth: {
      /**
       * Keep auth in tab session storage (not long-term localStorage).
       * This avoids stale cross-restart sessions while keeping login stable in-tab.
       */
      persistSession: true,
      storage: browserSessionStorage,
      /**
       * Avoid background refresh loops that can throw noisy `TypeError: Failed to fetch`
       * in unstable/offline dev sessions. We refresh on explicit auth actions instead.
       */
      autoRefreshToken: false,
      detectSessionInUrl: false,
      lock: inProcessAuthLock,
    },
  },
);
