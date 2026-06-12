"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ExploreFeedItem } from "@/lib/supabase/exploreFeed";
import { ChallengeCompactVideoThumb } from "@/components/challenges/ChallengeCompactVideoThumb";

type Props = {
  items: ExploreFeedItem[];
  source: "manual" | "computed";
};

export function ChallengeWinnersSection({ items, source }: Props) {
  const t = useTranslations("challenges");
  const tEx = useTranslations("explore");
  if (items.length === 0) return null;

  return (
    <section
      className="space-y-4 rounded-2xl border border-gn-accent/30 bg-gradient-to-b from-gn-accent/[0.08] to-gn-surface/30 p-5 ring-1 ring-gn-accent/15 sm:p-6"
      aria-labelledby="challenge-winners-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2
          id="challenge-winners-heading"
          className="text-lg font-bold tracking-tight text-gn-text"
        >
          {t("winnersHeading")}
        </h2>
        <p className="text-[11px] font-medium uppercase tracking-wider text-gn-text-tertiary">
          {source === "manual" ? t("winnersSourceManual") : t("winnersSourceComputed")}
        </p>
      </div>
      <ol className="grid gap-4 sm:grid-cols-3">
        {items.map((item, i) => {
          const rank = i + 1;
          const username =
            item.profile?.username?.trim() ||
            item.profile?.full_name?.trim() ||
            tEx("unknownPlayer");
          const slug =
            item.profile?.username?.trim() || item.profile?.id || item.video.user_id;
          const href = `/player/${encodeURIComponent(slug)}` as const;
          const medal =
            rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

          return (
            <li
              key={item.video.id ?? String(i)}
              className="flex flex-col rounded-xl border border-white/[0.08] bg-black/25 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl" aria-hidden>
                  {medal}
                </span>
                <span className="text-xs font-bold tabular-nums text-gn-accent">
                  {t("leaderboardAiScoreLabel")}{" "}
                  {item.aiOverallScore != null && Number.isFinite(item.aiOverallScore)
                    ? Math.round(item.aiOverallScore)
                    : t("leaderboardScorePending")}
                </span>
              </div>
              <Link href={href} className="mt-2 truncate text-sm font-semibold text-gn-text hover:text-gn-accent">
                {username}
              </Link>
              <p className="text-[11px] text-gn-text-tertiary">
                ♥ {item.likeCount}
                {item.competitionScore != null ? (
                  <span className="ms-2">
                    · {t("competitionScoreShort", { score: Math.round(item.competitionScore) })}
                  </span>
                ) : null}
              </p>
              {item.video.id ? (
                <ChallengeCompactVideoThumb
                  videoId={item.video.id}
                  video={item.video}
                  profileAvatarUrl={item.userAvatarUrl}
                  ariaLabel={t("compactVideoThumbAria", { name: username })}
                  className="mt-2"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
