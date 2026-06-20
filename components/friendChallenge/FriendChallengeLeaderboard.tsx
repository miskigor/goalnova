"use client";

import type { FriendChallengePlayerRow } from "@/lib/supabase/friendChallenges";
import { useTranslations } from "next-intl";

type Props = {
  players: FriendChallengePlayerRow[];
  viewerId: string | null;
  status: string;
  winnerUserId: string | null;
};

export function FriendChallengeLeaderboard({
  players,
  viewerId,
  status,
  winnerUserId,
}: Props) {
  const t = useTranslations("friendChallenges");

  if (players.length === 0) {
    return (
      <p className="text-sm text-gn-text-secondary">{t("waitingForOpponent")}</p>
    );
  }

  return (
    <ul className="space-y-3" aria-label={t("leaderboardAria")}>
      {players.map((player) => {
        const isYou = viewerId === player.user_id;
        const isWinner = status === "completed" && winnerUserId === player.user_id;
        return (
          <li
            key={player.user_id}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              isWinner
                ? "border-amber-400/50 bg-amber-500/10"
                : "border-gn-border-subtle bg-gn-surface/40"
            }`}
          >
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                player.rank === 1
                  ? "bg-gn-accent text-black"
                  : "bg-white/10 text-gn-text"
              }`}
            >
              #{player.rank ?? "—"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gn-text">
                {player.display_name}
                {isYou ? (
                  <span className="ms-1 text-xs font-normal text-gn-text-secondary">
                    ({t("you")})
                  </span>
                ) : null}
              </p>
              {player.username ? (
                <p className="truncate text-xs text-gn-text-secondary">@{player.username}</p>
              ) : null}
            </div>
            <div className="shrink-0 text-end">
              <p className="text-lg font-bold text-gn-accent">{player.total_xp}</p>
              <p className="text-[10px] uppercase tracking-wider text-gn-text-tertiary">XP</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
