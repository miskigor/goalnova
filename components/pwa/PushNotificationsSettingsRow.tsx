"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToWebPush,
} from "@/lib/pwa/pushNotifications";

type Props = {
  label: string;
  rowClassName: string;
};

export function PushNotificationsSettingsRow({ label, rowClassName }: Props) {
  const t = useTranslations("pwa");
  const [status, setStatus] = useState<"loading" | "unsupported" | NotificationPermission>(
    "loading",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getNotificationPermission().then(setStatus);
  }, []);

  async function onEnable() {
    setBusy(true);
    try {
      const permission = await requestNotificationPermission();
      setStatus(permission);
      if (permission === "granted") {
        await subscribeToWebPush();
      }
    } finally {
      setBusy(false);
    }
  }

  const hint =
    status === "loading"
      ? "…"
      : status === "granted"
        ? t("pushEnabled")
        : status === "denied"
          ? t("pushDenied")
          : status === "unsupported"
            ? t("pushUnsupported")
            : t("pushEnable");

  return (
    <button
      type="button"
      className={rowClassName}
      disabled={busy || status === "granted" || status === "unsupported" || status === "denied"}
      onClick={() => void onEnable()}
    >
      <span>{label}</span>
      <span className="text-gn-text-tertiary">{hint}</span>
    </button>
  );
}
