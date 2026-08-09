"use client";

import { useTranslations } from "next-intl";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { dispatchPwaOpenInstall } from "@/lib/pwa/events";

type Props = {
  className?: string;
  /** Compact row style for settings lists. */
  variant?: "button" | "row";
};

export function InstallAppButton({ className = "", variant = "button" }: Props) {
  const t = useTranslations("pwa");
  const { showInstallUi, promptInstall } = usePwaInstall();

  if (!showInstallUi) return null;

  async function onClick() {
    const outcome = await promptInstall();
    if (outcome === "ios-guide" || outcome === "unavailable") {
      dispatchPwaOpenInstall();
    }
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={() => void onClick()}
        className={[
          "flex w-full items-center justify-between rounded-xl border border-[#FF8A00]/35 bg-[#FF8A00]/10 px-4 py-3.5 text-left text-xs font-semibold text-gn-text transition-colors hover:border-[#FF8A00]/55 hover:bg-[#FF8A00]/16 max-lg:px-2 max-lg:py-1.5",
          className,
        ].join(" ")}
      >
        <span>📲 {t("installApp")}</span>
        <span className="text-[#FF8A00]">→</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className={[
        GN_PRIMARY_BUTTON_CLASS,
        "!bg-[#FF8A00] hover:!bg-[#ff9a24] shadow-[0_8px_28px_-6px_rgba(255,138,0,0.45)]",
        "box-border min-h-11 w-full max-w-full",
        className,
      ].join(" ")}
    >
      <span className="min-w-0 truncate">📲 {t("installApp")}</span>
    </button>
  );
}
