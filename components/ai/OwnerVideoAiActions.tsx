"use client";

import { useTranslations } from "next-intl";

type Props = {
  onAnalyze: () => void;
  /** `leading` = block is first in card (upload); `following` = after video (profile) */
  placement?: "leading" | "following";
};

/** Owner-only “Analyze with AI” block; modal handles premium vs analysis. */
export function OwnerVideoAiActions({
  onAnalyze,
  placement = "following",
}: Props) {
  const tAi = useTranslations("ai");
  const spacing =
    placement === "leading" ? "mb-3" : "mt-3";

  return (
    <div
      className={`${spacing} rounded-xl border border-gn-border-subtle bg-gn-surface/45 p-3 ring-1 ring-white/[0.04]`}
    >
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-gn-accent">
        {tAi("sectionTitle")}
      </h3>
      <button
        type="button"
        data-testid="pitchrusch-analyze-with-ai"
        onClick={onAnalyze}
        className="w-full rounded-lg bg-gn-accent px-4 py-3 text-sm font-semibold text-gn-bg shadow-sm transition-opacity hover:opacity-95"
      >
        {tAi("cta")}
      </button>
    </div>
  );
}
