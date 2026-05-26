"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/**
 * If Supabase auth init hangs (same `initializePromise` as `getSession` / INITIAL_SESSION),
 * `authed` would stay `null` forever and `PublicShell` shows a perpetual loading header on mobile.
 */
/** Align with AuthGate: mobile auth init can exceed a couple of seconds on slow networks. */
const NAV_SESSION_GET_SESSION_MS = 10_000;
/** Last resort before treating as guest — after getUser + optional getSession retry. */
const NAV_SESSION_FAILSAFE_MS = 22_000;

let navAuthResolveInFlight: Promise<{
  session: Session | null;
  user: User | null;
}> | null = null;

function hasPersistedSupabaseSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return false;
    const ref = new URL(url).hostname.split(".")[0];
    const raw = window.localStorage.getItem(`sb-${ref}-auth-token`);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { access_token?: string };
    return (
      typeof parsed?.access_token === "string" && parsed.access_token.length > 0
    );
  } catch {
    return false;
  }
}

function isAuthed(session: Session | null, user: User | null): boolean {
  return Boolean(session ?? user?.id);
}

async function resolveNavAuth(): Promise<{
  session: Session | null;
  user: User | null;
}> {
  const result = await Promise.race([
    supabase.auth.getSession(),
    new Promise<"timeout">((resolve) => {
      window.setTimeout(() => resolve("timeout"), NAV_SESSION_GET_SESSION_MS);
    }),
  ]);

  if (result !== "timeout") {
    const session = result.data.session ?? null;
    if (session) {
      return { session, user: session.user };
    }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user ?? null;
    return { session: null, user };
  }

  const { data: userData } = await supabase.auth.getUser();
  return { session: null, user: userData.user ?? null };
}

function resolveNavAuthOnce() {
  if (!navAuthResolveInFlight) {
    navAuthResolveInFlight = resolveNavAuth().finally(() => {
      navAuthResolveInFlight = null;
    });
  }
  return navAuthResolveInFlight;
}

export function useNavSession(): {
  authed: boolean | null;
  user: User | null;
} {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    let initSettled = false;

    const apply = (session: Session | null, nextUser?: User | null) => {
      if (cancelled) return;
      const resolvedUser = nextUser ?? session?.user ?? null;
      if (
        !isAuthed(session, resolvedUser) &&
        hasPersistedSupabaseSession()
      ) {
        return;
      }
      initSettled = true;
      setAuthed(isAuthed(session, resolvedUser));
      setUser(resolvedUser);
    };

    const applyGuest = (force = false) => {
      if (cancelled) return;
      if (initSettled && !force) return;
      if (!force && hasPersistedSupabaseSession()) {
        return;
      }
      initSettled = true;
      setAuthed(false);
      setUser(null);
    };

    const init = async () => {
      try {
        const { session, user: resolvedUser } = await resolveNavAuthOnce();
        if (cancelled) return;
        if (isAuthed(session, resolvedUser)) {
          apply(session, resolvedUser);
          return;
        }
        if (!hasPersistedSupabaseSession()) {
          applyGuest();
        }
      } catch {
        if (!cancelled && !hasPersistedSupabaseSession()) {
          applyGuest();
        }
      }
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session, session?.user ?? null);
    });

    const failsafeId = window.setTimeout(async () => {
      if (cancelled || initSettled) return;

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (cancelled) return;
        if (userData.user?.id) {
          apply(null, userData.user);
          return;
        }
      } catch {
        /* try getSession below */
      }

      if (cancelled || initSettled) return;

      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          apply(data.session);
          return;
        }
      } catch {
        /* fall through */
      }

      if (!cancelled && !initSettled) {
        applyGuest(true);
      }
    }, NAV_SESSION_FAILSAFE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(failsafeId);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { authed, user };
}
