"use client";

import { useEffect } from "react";
import { tryConsumePendingReferralWhenPlayerReady } from "@/lib/supabase/referrals";

/** Waits for player profile, then consumes pending referral (home / profile / benefits). */
export function ReferralConsumeOnMount() {
  useEffect(() => {
    void tryConsumePendingReferralWhenPlayerReady();
  }, []);
  return null;
}
