"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { GN_PRIMARY_BUTTON_CLASS, GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export type InstallPremiumVariant = "postRegistration" | "postFirstVideo";

type Props = {
  open: boolean;
  variant: InstallPremiumVariant;
  onInstall: () => void;
  onLater: () => void;
};

export function InstallPremiumScreen({ open, variant, onInstall, onLater }: Props) {
  const t = useTranslations("pwa");
  const titleId = useId();
  const { ios } = usePwaInstall();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const isFirstVideo = variant === "postFirstVideo";
  const benefits = isFirstVideo
    ? [
        t("firstVideoBenefit1"),
        t("firstVideoBenefit2"),
        t("firstVideoBenefit3"),
        t("firstVideoBenefit4"),
        t("firstVideoBenefit5"),
      ]
    : [
        t("regBenefit1"),
        t("regBenefit2"),
        t("regBenefit3"),
        t("regBenefit4"),
        t("regBenefit5"),
      ];

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
            🎉
          </p>
          <h1
            id={titleId}
            className="mt-3 text-center font-[family-name:var(--font-bebas)] text-4xl tracking-[0.04em] text-white sm:text-5xl"
          >
            {isFirstVideo ? t("firstVideoTitle") : t("regTitle")}
          </h1>
          <p className="mt-3 text-center text-base leading-relaxed text-neutral-300">
            {isFirstVideo ? t("firstVideoSubtitle") : t("regSubtitle")}
          </p>
          {isFirstVideo ? (
            <p className="mt-1 text-center text-sm font-medium text-[#FF8A00]">
              {t("firstVideoJourney")}
            </p>
          ) : null}

          <p className="mt-8 text-center text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {isFirstVideo ? t("firstVideoNeverMiss") : t("regNeverMiss")}
          </p>
          <ul className="mt-4 space-y-3">
            {benefits.map((line) => (
              <li
                key={line}
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                {line}
              </li>
            ))}
          </ul>

          {ios ? (
            <p className="mt-5 text-center text-xs leading-relaxed text-neutral-400">{t("iosHint")}</p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={onInstall}
              className={`${GN_PRIMARY_BUTTON_CLASS} min-h-14 !rounded-2xl !bg-[#FF8A00] !text-base !font-bold hover:!bg-[#ff9a24] shadow-[0_16px_40px_-8px_rgba(255,138,0,0.55)]`}
            >
              {isFirstVideo ? t("firstVideoInstall") : t("regInstall")}
            </button>
            <button
              type="button"
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
