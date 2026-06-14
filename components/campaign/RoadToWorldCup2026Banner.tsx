"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { RoadToWorldCup2026Modal } from "@/components/campaign/RoadToWorldCup2026Modal";
import { WORLD_CUP_CAMPAIGN_BANNER_SRC } from "@/lib/campaign/worldCupCampaignConfig";

type Props = {
  variant?: "home" | "challenges";
};

export function RoadToWorldCup2026Banner({ variant = "challenges" }: Props) {
  const t = useTranslations("worldCupCampaign");
  const [open, setOpen] = useState(false);
  const isHome = variant === "home";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("bannerAria")}
        className={[
          "group relative min-w-0 overflow-hidden text-left",
          isHome
            ? "flex h-[calc(9rem+env(safe-area-inset-top,0px))] w-full max-w-none shrink-0 items-start justify-center rounded-none border-0 bg-black pt-[calc(env(safe-area-inset-top,0px)+0.375rem)] shadow-none [container-type:size] sm:h-[calc(9.5rem+env(safe-area-inset-top,0px))]"
            : "block aspect-[2/1] w-full rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
          !isHome
            ? "transition hover:border-gn-accent/35 hover:shadow-[0_12px_40px_rgba(249,115,22,0.18)]"
            : "",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        ].join(" ")}
      >
        {isHome ? (
          <span className="relative h-[min(100cqh,50cqw)] w-[min(100cqw,200cqh)] shrink-0 overflow-hidden border border-gn-accent-hover shadow-[0_0_10px_rgba(251,146,60,0.85),0_0_1px_rgba(255,180,80,1)]">
            <Image
              src={WORLD_CUP_CAMPAIGN_BANNER_SRC}
              alt=""
              fill
              sizes="100vw"
              className="object-contain object-center"
              priority
            />
          </span>
        ) : (
          <>
            <Image
              src={WORLD_CUP_CAMPAIGN_BANNER_SRC}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover object-center transition duration-300 group-hover:scale-[1.02]"
            />
            <span
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/5"
              aria-hidden
            />
          </>
        )}
        <span className="sr-only">{t("title")}</span>
      </button>

      <RoadToWorldCup2026Modal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
