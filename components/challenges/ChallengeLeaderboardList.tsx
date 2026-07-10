"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ExploreFeedItem } from "@/lib/supabase/exploreFeed";
import { VideoMusicCredit } from "@/components/video/VideoMusicCredit";
import { ChallengeCompactVideoThumb } from "@/components/challenges/ChallengeCompactVideoThumb";

type Props = {
  items: ExploreFeedItem[];
  highlightVideoId: string | null;
  completionXp?: number;
};

export function ChallengeLeaderboardList({
  items,
  highlightVideoId,
  completionXp = 0,
}: Props) {
  const t = useTranslations("challenges");
  const tEx = useTranslations("explore");
  const highlightRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (!highlightVideoId || !highlightRef.current) return;
    const el = highlightRef.current;
    const run = () =>
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        run();
        window.setTimeout(run, 120);
      });
    });
  }, [highlightVideoId, items]);

  if (items.length === 0) return null;

  return (
    <section
      className="space-y-4"
      aria-labelledby="challenge-leaderboard-heading"
    >
      <h2
        id="challenge-leaderboard-heading"
        className="text-lg font-semibold tracking-tight text-gn-text"
      >
        {t("leaderboardSectionTitle")}
      </h2>
      <ol className="space-y-3">
        {items.map((item, index) => {
          const rank = index + 1;
          const { video, profile, likeCount } = item;
          const username =
            profile?.username?.trim() ||
            profile?.full_name?.trim() ||
            tEx("unknownPlayer");
          const slug =
            profile?.username?.trim() || profile?.id || video.user_id;
          const playerHref = `/player/${encodeURIComponent(slug)}` as const;
          const score = item.aiOverallScore;
          const scoreLabel =
            score != null && Number.isFinite(score)
              ? Math.round(score)
              : t("leaderboardScorePending");
          const comp = item.competitionScore;
          const compLabel =
            comp != null && Number.isFinite(comp)
              ? Math.round(comp)
              : null;
          const isHi = Boolean(
            highlightVideoId && video.id && highlightVideoId === video.id,
          );

          return (
            <li
              key={video.id ?? `${video.user_id}-${index}`}
              ref={isHi ? highlightRef : undefined}
              id={video.id ? `challenge-entry-${video.id}` : undefined}
              className={`flex gap-3 rounded-2xl border bg-gn-surface/40 p-3 sm:gap-4 sm:p-4 ${
                isHi
                  ? "border-gn-accent/80 ring-2 ring-gn-accent/50 motion-safe:animate-[gn-highlight-pulse_2.4s_ease-out_1]"
                  : "border-gn-border-subtle"
              }`}
            >
              <div
                className="flex w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-gn-bg/80 text-center sm:w-11"
                aria-label={t("leaderboardRankAria", { rank })}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-gn-text-tertiary">
                  {t("leaderboardRankLabel")}
                </span>
                <span className="text-lg font-bold tabular-nums text-gn-accent sm:text-xl">
                  {rank}
                </span>
              </div>
              {video.id ? (
                <ChallengeCompactVideoThumb
                  videoId={video.id}
                  video={video}
                  profileAvatarUrl={item.userAvatarUrl}
                  ariaLabel={t("compactVideoThumbAria", { name: username })}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {isHi ? (
                    <span className="rounded-full bg-gn-accent/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gn-accent">
                      {t("leaderboardYourEntry")}
                    </span>
                  ) : null}
                  <Link
                    href={playerHref}
                    className="truncate text-sm font-semibold text-gn-text hover:text-gn-accent"
                  >
                    {username}
                  </Link>
                  <span className="text-xs text-gn-text-tertiary">
                    ♥ {likeCount}
                  </span>
                  <span className="rounded-lg bg-gn-accent/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-gn-accent">
                    {t("leaderboardAiScoreLabel")}: {scoreLabel}
                  </span>
                  {compLabel != null ? (
                    <span className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-200/95">
                      {t("competitionScoreLabel")}: {compLabel}
                    </span>
                  ) : null}
                  {completionXp > 0 ? (
                    <span className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-200/95">
                      {t("leaderboardCompletionXpLabel", { xp: completionXp })}
                    </span>
                  ) : null}
                </div>
                {item.musicTrack ? (
                  <VideoMusicCredit track={item.musicTrack} compact className="mt-2" />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
