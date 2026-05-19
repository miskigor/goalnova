"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { clearFreshLogin } from "@/lib/auth/freshLogin";
import { supabase } from "@/lib/supabase/client";

const ARM_AFTER_MS = 4000;
/** OAuth (Google etc.) often keeps the tab in background >12s; avoid nuking the fresh session on return. */
const MIN_HIDDEN_MS_FOR_REAUTH = 120_000;

function hasOAuthCallbackInUrl(): boolean {
  if (typeof window === "undefined") return false;
  const { search, hash } = window.location;
  return (
    /(?:^|[?&])code=/.test(search) ||
    /(?:^|[?&])error=/.test(search) ||
    /(^|[#&])access_token=/.test(hash)
  );
}

export function RequireReauthOnReturn() {
  const router = useRouter();
  const signingOutRef = useRef(false);
  const hiddenAtRef = useRef<number | null>(null);
  const armedAtRef = useRef<number | null>(null);

  useEffect(() => {
    armedAtRef.current = Date.now();

    const forceReauth = async () => {
      if (signingOutRef.current) return;
      signingOutRef.current = true;
      clearFreshLogin();
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/login");
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;

      if (!hiddenAt) return;
      if (hasOAuthCallbackInUrl()) return;
      const armedAt = armedAtRef.current;
      if (!armedAt || Date.now() - armedAt < ARM_AFTER_MS) return;
      const elapsedMs = Date.now() - hiddenAt;
      if (elapsedMs >= MIN_HIDDEN_MS_FOR_REAUTH) {
        void forceReauth();
      }
    };

    const onPageHide = () => {
      hiddenAtRef.current = Date.now();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [router]);

  return null;
}
