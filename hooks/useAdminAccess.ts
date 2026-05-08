"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  fetchStaffAccess,
  type AdminStaffRole,
  type StaffAccess,
} from "@/lib/supabase/adminScoutVerification";

export type AdminAccessState = StaffAccess & {
  loaded: boolean;
};

/**
 * Staff gate for `/admin/*`: `isAdmin` / `isStaff` true when `admin_role` is set or legacy `is_admin`.
 */
export function useAdminAccess(): AdminAccessState & {
  refresh: () => Promise<void>;
  /** @deprecated use isStaff */
  isAdmin: boolean;
} {
  const [state, setState] = useState<AdminAccessState>({
    loaded: false,
    isStaff: false,
    role: null,
    isSuperAdmin: false,
    isSupportAdmin: false,
    isModerator: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      const s = await fetchStaffAccess();
      setState({
        loaded: true,
        isStaff: s.isStaff,
        role: s.role as AdminStaffRole | null,
        isSuperAdmin: s.isSuperAdmin,
        isSupportAdmin: s.isSupportAdmin,
        isModerator: s.isModerator,
        error: s.error,
      });
    } catch (e) {
      logFullSupabaseError("[useAdminAccess] refresh failed", e);
      setState({
        loaded: true,
        isStaff: false,
        role: null,
        isSuperAdmin: false,
        isSupportAdmin: false,
        isModerator: false,
        error: e instanceof Error ? e.message : "Unknown error",
      });
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

  return {
    ...state,
    isAdmin: state.isStaff,
    refresh,
  };
}
