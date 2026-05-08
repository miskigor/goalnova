"use client";

import { useTranslations } from "next-intl";
import type { MusicTrackSummary } from "@/lib/supabase/videoMusicSummary";

type Props = {
  track: MusicTrackSummary;
  className?: string;
  compact?: boolean;
};

/** Single-line credit for metadata MVP (no in-player mix yet). */
export function VideoMusicCredit({ track, className = "", compact }: Props) {
  const t = useTranslations("music");
  return (
    <p
      className={
        compact
          ? `min-w-0 break-words text-[11px] leading-snug text-gn-text-tertiary ${className}`
          : `min-w-0 break-words text-xs leading-relaxed text-gn-text-secondary ${className}`
      }
    >
      {t("creditFormatted", { title: track.title, artist: track.artist })}
    </p>
  );
}
