"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { PlayerPublicProfile } from "@/components/profile/PlayerPublicProfile";
import { PlayerProfileOverflowDebug } from "@/components/profile/PlayerProfileOverflowDebug";
import { publicProfileDebug } from "@/lib/profile/publicProfileDebug";
import {
  PUBLIC_PLAYER_PROFILE_PAGE_SHELL,
  PUBLIC_PLAYER_PROFILE_SECTION_CLASS,
} from "@/lib/layout/appShellClasses";
import type {
  PlayerProfileRow,
  VideoRow,
} from "@/lib/supabase/playerPublicProfile";

type Props = {
  playerSlug: string;
  initialProfile?: PlayerProfileRow | null;
  initialUserAvatarUrl?: string | null;
  initialVideos?: VideoRow[];
};

/**
 * Public `/player/[slug]` route shell — single bounded column (mobile-first).
 * Route file: app/[locale]/(public)/player/[playerSlug]/page.tsx
 */
export function PlayerPublicProfilePage({
  playerSlug,
  initialProfile,
  initialUserAvatarUrl = null,
  initialVideos,
}: Props) {
  const i18nPathname = usePathname();
  const [browserPathname, setBrowserPathname] = useState<string | null>(null);

  useEffect(() => {
    const browser = window.location.pathname;
    setBrowserPathname(browser);
    publicProfileDebug("render", {
      i18nPathname,
      playerSlug,
      extra: { child: "PlayerPublicProfile(embedded)" },
    });
  }, [i18nPathname, playerSlug]);

  return (
    <div
      data-public-profile-page
      data-player-public-profile
      data-public-profile-slug={playerSlug}
      data-public-profile-pathname={browserPathname ?? i18nPathname}
      data-public-profile-i18n-pathname={i18nPathname}
      className={PUBLIC_PLAYER_PROFILE_PAGE_SHELL}
    >
      <PlayerProfileOverflowDebug />
      <div className={PUBLIC_PLAYER_PROFILE_SECTION_CLASS}>
        <PlayerPublicProfile
          playerSlug={playerSlug}
          embedded
          publicProfile
          i18nPathname={i18nPathname}
          initialProfile={initialProfile}
          initialUserAvatarUrl={initialUserAvatarUrl}
          initialVideos={initialVideos}
        />
      </div>
    </div>
  );
}
