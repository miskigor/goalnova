"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { rememberReferralCodeFromQuery, tryConsumePendingReferralWithRetry } from "@/lib/supabase/referrals";
import { supabase } from "@/lib/supabase/client";

/**
 * Captures `?ref=` into sessionStorage and completes referral after sign-in / role selection.
 */
export function ReferralBootstrap() {
  const searchParams = useSearchParams();

  useEffect(() => {
    rememberReferralCodeFromQuery(searchParams.get("ref"));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void tryConsumePendingReferralWithRetry();
      }
    });
    void tryConsumePendingReferralWithRetry();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
