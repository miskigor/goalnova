"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";

const ARM_AFTER_MS = 4000;
const MIN_HIDDEN_MS_FOR_REAUTH = 12000;

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
