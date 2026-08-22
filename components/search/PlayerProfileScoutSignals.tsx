"use client";

import { useTranslations } from "next-intl";
import type { PlayerProfileRow } from "@/lib/supabase/publicPlayerProfiles";

export function PlayerProfileScoutSignals({
  row,
}: {
  row: Pick<
    PlayerProfileRow,
    "is_available_for_trials" | "is_looking_for_club" | "profile_highlight"
  >;
}) {
  const t = useTranslations("profileEditor");
  const highlight = row.profile_highlight?.trim() ?? "";
  const trials = row.is_available_for_trials === true;
  const looking = row.is_looking_for_club === true;
  if (!highlight && !trials && !looking) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {trials || looking ? (
        <div className="flex flex-wrap gap-1.5">
          {trials ? (
            <span className="rounded-full border border-gn-accent/35 bg-gn-accent/10 px-2 py-0.5 text-[10px] font-semibold text-gn-accent">
              {t("availableForTrials")}
            </span>
          ) : null}
          {looking ? (
            <span className="rounded-full border border-gn-border-subtle bg-gn-surface/80 px-2 py-0.5 text-[10px] font-semibold text-gn-text-secondary">
              {t("lookingForClub")}
            </span>
          ) : null}
        </div>
      ) : null}
      {highlight ? (
        <p className="line-clamp-2 text-xs leading-relaxed text-gn-text-secondary">
          {highlight}
        </p>
      ) : null}
    </div>
  );
}
