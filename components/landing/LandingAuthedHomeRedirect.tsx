"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { hasFreshLogin } from "@/lib/auth/freshLogin";
import {
  consumeAuthRedirectFromUrl,
  urlHasPendingAuthRedirect,
} from "@/lib/auth/consumeAuthRedirectFromUrl";
import { supabase } from "@/lib/supabase/client";

/** Fresh sign-in visit to `/` → home feed; stale persisted sessions stay on marketing (no app chrome flash). */
export function LandingAuthedHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (urlHasPendingAuthRedirect()) {
        await consumeAuthRedirectFromUrl();
      }
      if (cancelled) return;

      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session || !hasFreshLogin()) return;
      router.replace("/home");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
