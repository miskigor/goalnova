"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { hasPersistedSupabaseSession } from "@/lib/auth/hasPersistedSupabaseSession";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  fetchUserIsPremium,
  PITCHRUSCH_PREMIUM_UPDATED_EVENT,
} from "@/lib/supabase/premium";

export type PremiumContextValue = {
  /** Current auth user id, or null if signed out. */
  userId: string | null;
  isPremium: boolean;
  /** False until the first auth + premium sync for this browser session completes. */
  premiumLoaded: boolean;
  /** Re-read `is_premium` from Supabase (e.g. after mock upgrade). */
  refreshPremium: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextValue | null>(null);

function sessionUserId(session: Session | null): string | null {
  return session?.user?.id ?? null;
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumLoaded, setPremiumLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const loadPremiumForUser = useCallback(async (uid: string | null) => {
    if (!uid) {
      setIsPremium(false);
      setPremiumLoaded(true);
      return;
    }
    setPremiumLoaded(false);
    const { isPremium: p } = await fetchUserIsPremium(uid);
    setIsPremium(p);
    setPremiumLoaded(true);
  }, []);

  const applySession = useCallback(
    (session: Session | null) => {
      const uid = sessionUserId(session);
      setUserId(uid);
      void loadPremiumForUser(uid);
    },
    [loadPremiumForUser],
  );

  const refreshPremium = useCallback(async () => {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) {
      logFullSupabaseError("[PremiumProvider] refreshPremium getSession", sessionError);
    }
    const uid = sessionUserId(sessionData.session ?? null);
    setUserId(uid);
    await loadPremiumForUser(uid);
  }, [loadPremiumForUser]);

  useEffect(() => {
    if (!hasPersistedSupabaseSession()) {
      setUserId(null);
      setIsPremium(false);
      setPremiumLoaded(true);
      return;
    }

    let cancelled = false;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (cancelled) return;
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          applySession(session);
        } else if (event === "SIGNED_OUT") {
          applySession(null);
        }
      },
    );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [applySession]);

  // If INITIAL_SESSION never fires (auth init stall), unblock guest UI — but never while a user session is syncing premium.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (userIdRef.current) return;
      setPremiumLoaded((prev) => (prev ? prev : true));
    }, 6000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const onUpdated = () => {
      void refreshPremium();
    };
    window.addEventListener(PITCHRUSCH_PREMIUM_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(PITCHRUSCH_PREMIUM_UPDATED_EVENT, onUpdated);
  }, [refreshPremium]);

  const value = useMemo<PremiumContextValue>(
    () => ({
      userId,
      isPremium,
      premiumLoaded,
      refreshPremium,
    }),
    [userId, isPremium, premiumLoaded, refreshPremium],
  );

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error("usePremium must be used within PremiumProvider");
  }
  return ctx;
}
