"use client";

import { useEffect } from "react";
import { tryConsumePendingReferralWithRetry } from "@/lib/supabase/referrals";

/** Runs robust pending-referral consume when the shell route mounts (home / profile / benefits use this). */
export function ReferralConsumeOnMount() {
  useEffect(() => {
    void tryConsumePendingReferralWithRetry();
  }, []);
  return null;
}
