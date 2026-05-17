"use client";

import { PlayerPublicProfile } from "@/components/profile/PlayerPublicProfile";
import { PlayerProfileOverflowDebug } from "@/components/profile/PlayerProfileOverflowDebug";
import {
  PUBLIC_PLAYER_PROFILE_PAGE_SHELL,
  PUBLIC_PLAYER_PROFILE_SECTION_CLASS,
} from "@/lib/layout/appShellClasses";

type Props = {
  playerSlug: string;
};

/**
 * Public `/player/[slug]` route shell — single bounded column (mobile-first).
 */
export function PlayerPublicProfilePage({ playerSlug }: Props) {
  return (
    <div data-player-public-profile className={PUBLIC_PLAYER_PROFILE_PAGE_SHELL}>
      <PlayerProfileOverflowDebug />
      <div className={PUBLIC_PLAYER_PROFILE_SECTION_CLASS}>
        <PlayerPublicProfile playerSlug={playerSlug} embedded />
      </div>
    </div>
  );
}
