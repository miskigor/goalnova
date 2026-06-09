"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { hasPersistedSupabaseSession } from "@/lib/auth/hasPersistedSupabaseSession";
import {
  recoverIfInvalidRefreshToken,
  recoverStaleSupabaseSession,
} from "@/lib/auth/staleSessionRecovery";
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

type NavSessionSnapshot = {
  authed: boolean | null;
  user: User | null;
};

let navSessionSnapshot: NavSessionSnapshot = { authed: null, user: null };
let navSessionSyncStarted = false;
let navSessionInitSettled = false;
const navSessionSubscribers = new Set<() => void>();

function publishNavSession(next: NavSessionSnapshot) {
  navSessionSnapshot = next;
  navSessionSubscribers.forEach((notify) => notify());
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
    if (result.error && (await recoverIfInvalidRefreshToken(result.error))) {
      return { session: null, user: null };
    }
    const session = result.data.session ?? null;
    if (session) {
      return { session, user: session.user };
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr && (await recoverIfInvalidRefreshToken(userErr))) {
      return { session: null, user: null };
    }
    const user = userData.user ?? null;
    return { session: null, user };
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr && (await recoverIfInvalidRefreshToken(userErr))) {
    return { session: null, user: null };
  }
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

function applyNavSession(session: Session | null, nextUser?: User | null) {
  const resolvedUser = nextUser ?? session?.user ?? null;
  if (!isAuthed(session, resolvedUser) && hasPersistedSupabaseSession()) {
    return;
  }
  navSessionInitSettled = true;
  publishNavSession({
    authed: isAuthed(session, resolvedUser),
    user: resolvedUser,
  });
}

function applyNavGuest(force = false) {
  if (navSessionInitSettled && !force) return;
  if (!force && hasPersistedSupabaseSession()) return;
  navSessionInitSettled = true;
  publishNavSession({ authed: false, user: null });
}

function startNavSessionSync() {
  if (navSessionSyncStarted || typeof window === "undefined") return;
  navSessionSyncStarted = true;

  if (!hasPersistedSupabaseSession()) {
    applyNavGuest(true);
  }

  void (async () => {
    try {
      const { session, user: resolvedUser } = await resolveNavAuthOnce();
      if (isAuthed(session, resolvedUser)) {
        applyNavSession(session, resolvedUser);
        return;
      }
      if (!hasPersistedSupabaseSession()) {
        applyNavGuest();
      }
    } catch (err) {
      if (await recoverIfInvalidRefreshToken(err)) {
        applyNavGuest(true);
        return;
      }
      if (!hasPersistedSupabaseSession()) {
        applyNavGuest();
      }
    }
  })();

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT" && !session) {
      await recoverStaleSupabaseSession();
      applyNavGuest(true);
      return;
    }
    applyNavSession(session, session?.user ?? null);
  });

  window.setTimeout(async () => {
    if (navSessionInitSettled) return;

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr && (await recoverIfInvalidRefreshToken(userErr))) {
        applyNavGuest(true);
        return;
      }
      if (userData.user?.id) {
        applyNavSession(null, userData.user);
        return;
      }
    } catch (err) {
      if (await recoverIfInvalidRefreshToken(err)) {
        applyNavGuest(true);
        return;
      }
      /* try getSession below */
    }

    if (navSessionInitSettled) return;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && (await recoverIfInvalidRefreshToken(error))) {
        applyNavGuest(true);
        return;
      }
      if (data.session) {
        applyNavSession(data.session);
        return;
      }
    } catch (err) {
      if (await recoverIfInvalidRefreshToken(err)) {
        applyNavGuest(true);
        return;
      }
      /* fall through */
    }

    if (!navSessionInitSettled) {
      if (hasPersistedSupabaseSession()) {
        try {
          const { error } = await supabase.auth.getSession();
          if (error) await recoverIfInvalidRefreshToken(error);
        } catch (err) {
          await recoverIfInvalidRefreshToken(err);
        }
      }
      applyNavGuest(true);
    }
  }, NAV_SESSION_FAILSAFE_MS);
}

export function useNavSession(): {
  authed: boolean | null;
  user: User | null;
} {
  const [, bump] = useState(0);

  useEffect(() => {
    startNavSessionSync();
    const notify = () => bump((n) => n + 1);
    navSessionSubscribers.add(notify);
    return () => {
      navSessionSubscribers.delete(notify);
    };
  }, []);

  return navSessionSnapshot;
}
