"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { PITCHRUSCH_PREMIUM_UPDATED_EVENT } from "@/lib/supabase/premium";

type Props = {
  sessionId: string;
};

export function PaymentSuccessActivation({ sessionId }: Props) {
  const t = useTranslations("payment");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const isValidSessionId = useMemo(() => sessionId.trim().length > 0, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    if (!isValidSessionId) {
      setStatus("error");
      setMessage(t("activationMissingSession"));
      return;
    }
    void (async () => {
      setStatus("loading");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";
      const res = await fetch("/api/stripe/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;
      if (cancelled) return;
      if (!res.ok) {
        setStatus("error");
        setMessage(json?.error ?? t("activationFailed"));
        return;
      }
      setStatus("done");
      setMessage(t("activationDone"));
      window.dispatchEvent(new CustomEvent(PITCHRUSCH_PREMIUM_UPDATED_EVENT));
    })();
    return () => {
      cancelled = true;
    };
  }, [isValidSessionId, sessionId, t]);

  if (status === "idle") return null;
  if (status === "loading") {
    return <p className="mt-3 text-xs text-gn-text-secondary">{t("activationLoading")}</p>;
  }
  if (status === "error") {
    return <p className="mt-3 text-xs text-red-300">{message}</p>;
  }
  return <p className="mt-3 text-xs text-emerald-300">{message}</p>;
}

