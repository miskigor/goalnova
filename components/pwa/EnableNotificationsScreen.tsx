"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { GN_PRIMARY_BUTTON_CLASS, GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import {
  getNotificationPermission,
  previewPushExample,
  requestNotificationPermission,
  subscribeToWebPush,
} from "@/lib/pwa/pushNotifications";

type Props = {
  open: boolean;
  onEnabled: () => void;
  onLater: () => void;
};

export function EnableNotificationsScreen({ open, onEnabled, onLater }: Props) {
  const t = useTranslations("pwa");
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const benefits = [
    t("notifBenefit1"),
    t("notifBenefit2"),
    t("notifBenefit3"),
    t("notifBenefit4"),
    t("notifBenefit5"),
  ];

  async function onEnable() {
    setBusy(true);
    setError(null);
    try {
      const existing = await getNotificationPermission();
      if (existing === "unsupported") {
        setError(t("pushUnsupported"));
        return;
      }
      if (existing === "denied") {
        setError(t("notifDeniedHint"));
        return;
      }

      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        setError(permission === "denied" ? t("notifDeniedHint") : t("notifNotGranted"));
        return;
      }

      await subscribeToWebPush();
      // Immediate on-device preview so the user sees a real lock-screen style alert.
      void previewPushExample("scout_view");
      onEnabled();
    } catch {
      setError(t("notifError"));
    } finally {
      setBusy(false);
    }
  }

  const screen = (
    <div
      className="fixed inset-0 z-[130] flex items-stretch justify-center overflow-y-auto bg-[#111111]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="relative flex min-h-dvh w-full max-w-lg flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,138,0,0.22),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(255,138,0,0.08),_transparent_50%)]"
          aria-hidden
        />

        <div className="relative flex flex-1 flex-col justify-center">
          <div className="pwa-logo-pulse mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF8A00]/15 ring-1 ring-[#FF8A00]/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/pitchrusch-logo.svg" alt="" width={44} height={44} />
          </div>

          <p className="text-center text-4xl" aria-hidden>
            🔔
          </p>
          <h1
            id={titleId}
            className="mt-3 text-center font-[family-name:var(--font-bebas)] text-4xl tracking-[0.04em] text-white sm:text-5xl"
          >
            {t("notifTitle")}
          </h1>
          <p className="mt-3 text-center text-base leading-relaxed text-neutral-300">
            {t("notifSubtitle")}
          </p>

          <ul className="mt-8 space-y-3">
            {benefits.map((line) => (
              <li
                key={line}
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                {line}
              </li>
            ))}
          </ul>

          {error ? (
            <p role="alert" className="mt-5 text-center text-sm text-[#FF8A00]">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onEnable()}
              className={`${GN_PRIMARY_BUTTON_CLASS} min-h-14 !rounded-2xl !bg-[#FF8A00] !text-base !font-bold hover:!bg-[#ff9a24] shadow-[0_16px_40px_-8px_rgba(255,138,0,0.55)]`}
            >
              {busy ? t("notifEnabling") : t("notifEnable")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onLater}
              className={`${GN_SECONDARY_BUTTON_CLASS} !border-transparent !bg-transparent text-neutral-400 hover:text-white`}
            >
              {t("maybeLater")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(screen, document.body);
}
