"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/**
 * If Supabase auth init hangs (same `initializePromise` as `getSession` / INITIAL_SESSION),
 * `authed` would stay `null` forever and `PublicShell` shows a perpetual loading header on mobile.
 */
const NAV_SESSION_FAILSAFE_MS = 2200;

export function useNavSession(): {
  authed: boolean | null;
  user: User | null;
} {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    const apply = (session: Session | null) => {
      if (cancelled) return;
      setAuthed(Boolean(session));
      setUser(session?.user ?? null);
    };

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) apply(data.session ?? null);
      })
      .catch(() => {
        if (!cancelled) apply(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session);
    });

    const failsafeId = window.setTimeout(() => {
      if (cancelled) return;
      setAuthed((prev) => (prev === null ? false : prev));
    }, NAV_SESSION_FAILSAFE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(failsafeId);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { authed, user };
}
