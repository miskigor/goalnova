"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import {
  getNotificationPermission,
  previewPushExample,
  requestNotificationPermission,
  subscribeToWebPush,
} from "@/lib/pwa/pushNotifications";
import { markNotificationPromptDone } from "@/lib/pwa/storage";

type Props = {
  className?: string;
};

export function EnablePushCard({ className = "" }: Props) {
  const t = useTranslations("pwa");
  const [status, setStatus] = useState<"loading" | "unsupported" | NotificationPermission>(
    "loading",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getNotificationPermission().then(setStatus);
  }, []);

  if (status === "loading" || status === "granted" || status === "unsupported") {
    if (status === "granted") {
      return (
        <div
          className={`rounded-2xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/90 ${className}`}
        >
          🔔 {t("pushEnabledHint")}
        </div>
      );
    }
    return null;
  }

  async function onEnable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await requestNotificationPermission();
      setStatus(permission);
      if (permission !== "granted") {
        setError(permission === "denied" ? t("notifDeniedHint") : t("notifNotGranted"));
        return;
      }
      await subscribeToWebPush();
      markNotificationPromptDone();
      void previewPushExample("new_follower");
    } catch {
      setError(t("notifError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border border-[#FF8A00]/35 bg-gradient-to-b from-[#FF8A00]/12 to-transparent px-4 py-4 ${className}`}
    >
      <p className="text-sm font-semibold text-gn-text">{t("notifTitle")}</p>
      <p className="mt-1 text-xs leading-relaxed text-gn-text-secondary">{t("notifSubtitle")}</p>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-[#FF8A00]">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy || status === "denied"}
        onClick={() => void onEnable()}
        className={`${GN_PRIMARY_BUTTON_CLASS} mt-3 !bg-[#FF8A00] hover:!bg-[#ff9a24]`}
      >
        {busy ? t("notifEnabling") : t("notifEnable")}
      </button>
    </div>
  );
}
