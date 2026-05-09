"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";

const RETURN_LOGOUT_KEY = "goalnova:reauth-on-return:hidden-at";

export function RequireReauthOnReturn() {
  const router = useRouter();
  const signingOutRef = useRef(false);

  useEffect(() => {
    const markHidden = () => {
      try {
        window.localStorage.setItem(RETURN_LOGOUT_KEY, String(Date.now()));
      } catch {
        // Ignore storage write issues (private mode, quota, etc).
      }
    };

    const clearMarker = () => {
      try {
        window.localStorage.removeItem(RETURN_LOGOUT_KEY);
      } catch {
        // Ignore storage read/remove issues.
      }
    };

    const shouldForceReauth = (): boolean => {
      try {
        return Boolean(window.localStorage.getItem(RETURN_LOGOUT_KEY));
      } catch {
        return false;
      }
    };

    const forceReauth = async () => {
      if (signingOutRef.current) return;
      signingOutRef.current = true;
      clearMarker();
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/login");
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markHidden();
        return;
      }
      if (shouldForceReauth()) {
        void forceReauth();
      }
    };

    const onPageHide = () => {
      markHidden();
    };

    // If the page was restored with an existing marker, force login immediately.
    if (shouldForceReauth()) {
      void forceReauth();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [router]);

  return null;
}
