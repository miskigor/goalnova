"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { GN_PRIMARY_BUTTON_CLASS, GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { usePwaInstall } from "@/hooks/usePwaInstall";

type Props = {
  open: boolean;
  onInstall: () => void;
  onLater: () => void;
  showIosHint?: boolean;
};

export function InstallPromptModal({ open, onInstall, onLater, showIosHint }: Props) {
  const t = useTranslations("pwa");
  const titleId = useId();
  const { ios } = usePwaInstall();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onLater();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onLater]);

  if (!open || typeof document === "undefined") return null;

  const modal = (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onLater();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pwa-sheet-in relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a1a1a] via-[#111111] to-[#0a0a0a] p-6 shadow-[0_32px_100px_rgba(0,0,0,0.65)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#FF8A00]/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF8A00]/15 ring-1 ring-[#FF8A00]/35">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/pitchrusch-logo.svg" alt="" width={36} height={36} />
          </div>
          <h2 id={titleId} className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {t("visitTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">{t("visitBody")}</p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-200">
            <li>• {t("visitBenefit1")}</li>
            <li>• {t("visitBenefit2")}</li>
            <li>• {t("visitBenefit3")}</li>
            <li>• {t("visitBenefit4")}</li>
          </ul>
          {(showIosHint || ios) && (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-neutral-300">
              {t("iosHint")}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onInstall}
              className={`${GN_PRIMARY_BUTTON_CLASS} !bg-[#FF8A00] hover:!bg-[#ff9a24] shadow-[0_10px_32px_-6px_rgba(255,138,0,0.5)]`}
            >
              {t("visitInstall")}
            </button>
            <button type="button" onClick={onLater} className={GN_SECONDARY_BUTTON_CLASS}>
              {t("visitLater")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
