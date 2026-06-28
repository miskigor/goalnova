"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import {
  rememberClubInviteCode,
  tryConsumePendingClubInviteWhenPlayerReady,
} from "@/lib/clubs/clubInviteStorage";
import { supabase } from "@/lib/supabase/client";

/** Captures `/invite/[code]` and completes join after player auth. */
export function ClubInviteBootstrap() {
  const params = useParams();
  const code = typeof params?.code === "string" ? params.code : null;

  useEffect(() => {
    rememberClubInviteCode(code);
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void tryConsumePendingClubInviteWhenPlayerReady();
      }
    });
    void tryConsumePendingClubInviteWhenPlayerReady();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
