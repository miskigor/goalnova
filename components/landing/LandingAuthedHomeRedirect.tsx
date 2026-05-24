"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";

/**
 * Logged-in users opening `/` or `/[locale]` should land on the app home feed
 * (full-screen feed + app chrome), not the marketing landing hero.
 */
export function LandingAuthedHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      router.replace("/home");
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/home");
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
