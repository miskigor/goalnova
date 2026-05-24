"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";

/** Logged-in visit to `/` → app home feed (header + bottom nav), not marketing landing. */
export function LandingAuthedHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      router.replace("/home");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
