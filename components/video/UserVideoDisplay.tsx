"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Database } from "@/lib/supabase/client";
import type { ChallengeRow } from "@/lib/supabase/challenges";
import { ChallengeTagPill } from "@/components/challenges/ChallengeTagPill";
import {
  challengeDisplayTitle,
  challengeLinkSegment,
} from "@/lib/challenges/challengeRowUtils";
import { videoPlaybackCandidates, videoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";
import { PlaybackVideo } from "@/components/video/PlaybackVideo";

export type UserVideoRow = Database["public"]["Tables"]["videos"]["Row"];

type Props = {
  video: UserVideoRow;
  challenge?: ChallengeRow | null;
};

/**
 * Simple, visible playback for a row from `public.videos`.
 * Use anywhere user-uploaded clips are shown.
 */
export function UserVideoDisplay({ video, challenge }: Props) {
  const t = useTranslations("upload");
  const url = videoPlaybackUrl(video);
  const playbackSources = videoPlaybackCandidates(video);
  const [loadFailed, setLoadFailed] = useState(false);

  const hasUrl = url.length > 0;

  return (
    <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4">
      <div
        className="relative flex w-full max-w-full items-center justify-center overflow-hidden rounded-xl bg-black max-sm:aspect-[9/16] sm:min-h-[280px]"
        style={{ minWidth: "100%" }}
      >
        {hasUrl ? (
          <>
            <PlaybackVideo
              className="absolute inset-0 z-0 h-full w-full object-cover sm:relative sm:inset-auto sm:block sm:h-auto sm:min-h-[240px] sm:max-h-[min(70vh,520px)] sm:w-full sm:object-contain"
              sources={playbackSources}
              preload="metadata"
              onLoadOk={() => {
                setLoadFailed(false);
              }}
              onLoadError={() => {
                setLoadFailed(true);
              }}
            />
          </>
        ) : (
          <div
            className="flex min-h-[240px] w-full items-center justify-center bg-neutral-950 px-4 text-center text-sm text-gn-text-tertiary"
            style={{ minHeight: 280 }}
          >
            {t("noVideoUrlInRow")}
          </div>
        )}
      </div>

      {loadFailed && hasUrl ? (
        <p className="mt-2 text-sm text-gn-accent" role="alert">
          {t("videoCouldNotLoad")}
        </p>
      ) : null}

      {challenge ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <ChallengeTagPill
            routeSegment={challengeLinkSegment(challenge)}
            displayTitle={challengeDisplayTitle(challenge)}
          />
        </div>
      ) : null}

      <dl className="mt-4 grid gap-2 text-sm text-gn-text-secondary">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
            {t("caption")}
          </dt>
          <dd className="text-gn-text">{video.caption?.trim() || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
            {t("skillType")}
          </dt>
          <dd className="text-gn-text">{video.skill_type?.trim() || "—"}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
              {t("city")}
            </dt>
            <dd className="text-gn-text">{video.city?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
              {t("country")}
            </dt>
            <dd className="text-gn-text">{video.country?.trim() || "—"}</dd>
          </div>
        </div>
      </dl>
    </div>
  );
}
