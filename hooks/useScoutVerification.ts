"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { devWarn } from "@/lib/devLog";
import {
  isLikelyTransientNetworkFailure,
  logFullSupabaseError,
} from "@/lib/supabase/logError";
import {
  fetchScoutAccessForUser,
  type ScoutAccessRow,
} from "@/lib/supabase/scoutVerification";
import {
  isApprovedScoutUser,
  isUnverifiedScoutUser,
} from "@/lib/scoutVerification";

export type ScoutVerificationState = {
  loaded: boolean;
  userId: string | null;
  row: ScoutAccessRow | null;
};

const GET_SESSION_TIMEOUT_MS = 8000;

/**
 * `getSession()` can stall with the same Supabase auth init lock as elsewhere; without a
 * timeout, `loaded` never flips true and feeds stay on a permanent loading state (seen on mobile).
 */
async function getSessionOrTimeout() {
  const result = await Promise.race([
    supabase.auth.getSession(),
    new Promise<"timeout">((resolve) => {
      window.setTimeout(() => resolve("timeout"), GET_SESSION_TIMEOUT_MS);
    }),
  ]);
  if (result === "timeout") {
    return { data: { session: null }, error: null } as Awaited<
      ReturnType<typeof supabase.auth.getSession>
    >;
  }
  return result;
}

/**
 * Current user's scout role + verification status (for UI gates).
 */
export function useScoutVerification(): ScoutVerificationState & {
  isApprovedScout: boolean;
  /** Scout role but not `scout_verification_status === 'approved'`. */
  isUnverifiedScout: boolean;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<ScoutVerificationState>({
    loaded: false,
    userId: null,
    row: null,
  });

  const refresh = useCallback(async () => {
    try {
      const { data: sessionData, error: sessionError } =
        await getSessionOrTimeout();
      if (sessionError) {
        setState({ loaded: true, userId: null, row: null });
        return;
      }
      const uid = sessionData.session?.user?.id ?? null;
      if (!uid) {
        setState({ loaded: true, userId: null, row: null });
        return;
      }
      const { row } = await fetchScoutAccessForUser(uid);
      setState({ loaded: true, userId: uid, row });
    } catch (e) {
      if (isLikelyTransientNetworkFailure(e)) {
        devWarn("[useScoutVerification] refresh skipped (transient network)", e);
      } else {
        logFullSupabaseError("[useScoutVerification] refresh failed", e);
      }
      setState({ loaded: true, userId: null, row: null });
    }
  }, []);

  useEffect(() => {
    const tid = window.setTimeout(() => {
      void refresh();
    }, 0);
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => {
      window.clearTimeout(tid);
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  const isApprovedScout = Boolean(
    state.row &&
      isApprovedScoutUser({
        role: state.row.role,
        scout_verification_status: state.row.scout_verification_status,
      }),
  );

  const isUnverifiedScout = Boolean(
    state.row &&
      isUnverifiedScoutUser({
        role: state.row.role,
        scout_verification_status: state.row.scout_verification_status,
      }),
  );

  return { ...state, isApprovedScout, isUnverifiedScout, refresh };
}
