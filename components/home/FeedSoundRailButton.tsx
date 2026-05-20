"use client";

import { useTranslations } from "next-intl";
import { useHomeFeedSound } from "@/components/home/HomeFeedSoundContext";

type Props = {
  feedVideoKey: string;
};

/** Matches `FeedVideoEngagement` rail icon size (comment glyph). */
const ICON =
  "size-[18px] max-lg:size-3 shrink-0 text-current opacity-95";

function SoundOnGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M11 5 6 9H3v6h3l5 4V5Z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <path
        d="M15.5 8.5a5 5 0 0 1 0 7M17.5 6.5a8 8 0 0 1 0 11"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}

function SoundOffGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M11 5 6 9H3v6h3l5 4v-5"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <path
        d="m22 9-6 6M16 9l6 6"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * TikTok-style rail control: toggles global feed sound; matches Like / Comment / Share sizing.
 */
export function FeedSoundRailButton({ feedVideoKey }: Props) {
  const t = useTranslations("homeFeed");
  const {
    isSoundEnabled,
    setSoundEnabled,
    activeVideoId,
    requestPlaybackRetry,
  } = useHomeFeedSound();

  const isFeedActive = activeVideoId === feedVideoKey;
  const audible = isSoundEnabled && isFeedActive;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setSoundEnabled((prev) => !prev);
        requestPlaybackRetry();
      }}
      aria-pressed={audible}
      aria-label={audible ? t("videoMuteAria") : t("videoUnmuteAria")}
      className={[
        "flex h-10 w-10 max-lg:h-6 max-lg:w-6 shrink-0 items-center justify-center rounded-full border font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.4)] max-lg:shadow-[0_2px_10px_rgba(0,0,0,0.4)] backdrop-blur-md transition-[color,background-color,border-color,transform] duration-200 ease-out motion-reduce:transition-colors",
        audible
          ? "border-gn-accent/50 bg-gn-accent/15 text-gn-accent shadow-[0_0_18px_-4px_rgba(249,115,22,0.35)]"
          : "border-white/12 bg-black/30 text-white/85 hover:border-white/20 hover:bg-white/[0.08]",
      ].join(" ")}
    >
      {audible ? (
        <SoundOnGlyph className={ICON} />
      ) : (
        <SoundOffGlyph className={ICON} />
      )}
    </button>
  );
}
