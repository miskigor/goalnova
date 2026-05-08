"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  resolveVideoUploadEligibility,
  type VideoUploadEligibility,
} from "@/lib/supabase/videoUploadEligibility";

/**
 * Whether the signed-in user may upload (player). Re-runs on auth changes.
 * Waits for Supabase auth listener + a deferred tick so the client can restore
 * the session from storage before the first eligibility check.
 */
export function useVideoUploadEligibility(): VideoUploadEligibility {
  const [status, setStatus] = useState<VideoUploadEligibility>("loading");

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const next = await resolveVideoUploadEligibility();
      if (!cancelled) setStatus(next);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    const t =
      typeof window !== "undefined"
        ? window.setTimeout(() => {
            void refresh();
          }, 0)
        : null;

    return () => {
      cancelled = true;
      if (t != null) window.clearTimeout(t);
      subscription.unsubscribe();
    };
  }, []);

  return status;
}
