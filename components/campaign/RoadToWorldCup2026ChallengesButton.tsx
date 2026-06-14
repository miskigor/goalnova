"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RoadToWorldCup2026Modal } from "@/components/campaign/RoadToWorldCup2026Modal";

/** Challenges hub — opens compact campaign modal (prize, XP, top 10, rank). */
export function RoadToWorldCup2026ChallengesButton() {
  const t = useTranslations("worldCupCampaign");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("bannerAria")}
        className="my-3 inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500 px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_28px_-6px_rgba(16,185,129,0.45)] ring-1 ring-white/10 transition-[background-color,box-shadow,transform] duration-300 ease-gn-smooth hover:bg-emerald-400 hover:shadow-[0_12px_36px_-8px_rgba(16,185,129,0.55)] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg"
      >
        {t("title")}
      </button>

      <RoadToWorldCup2026Modal open={open} onClose={() => setOpen(false)} variant="compact" />
    </>
  );
}
