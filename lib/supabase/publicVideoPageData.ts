import { cache } from "react";
import {
  parseChallengeRowLoose,
  withChallengeSelectFallback,
  type ChallengeRow,
} from "@/lib/challenges/challengeRowUtils";
import { devError } from "@/lib/devLog";
import type { Database } from "@/lib/supabase/database.types";
import { createAnonSupabaseServerClient } from "@/lib/supabase/anonServerClient";
import { rpcFetchPublicPlayerProfileById } from "@/lib/supabase/publicPlayerProfiles";
import {
  fetchMusicTrackSummariesByIds,
  selectedMusicTrackIdFromVideo,
  type MusicTrackSummary,
} from "@/lib/supabase/videoMusicSummary";
import { videoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";

export type PublicVideoPageVideo = Database["public"]["Tables"]["videos"]["Row"];
export type PublicVideoPageProfile =
  Database["public"]["Tables"]["player_profiles"]["Row"];

export type PublicVideoPageData = {
  video: PublicVideoPageVideo;
  profile: PublicVideoPageProfile | null;
  /** Canonical avatar from `public.users.avatar_url`. */
  userAvatarUrl: string | null;
  challenge: ChallengeRow | null;
  musicTrack: MusicTrackSummary | null;
};

/**
 * Cached per-request for use in both `generateMetadata` and the page.
 */
export const getPublicVideoPageData = cache(
  async (videoId: string): Promise<PublicVideoPageData | null> => {
    const id = String(videoId ?? "").trim();
    if (!id) return null;

    const supabase = createAnonSupabaseServerClient();
    if (!supabase) {
      devError("[PitchRusch public video] Supabase env missing (URL or anon key)");
      return null;
    }

    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (videoError) {
      devError("[PitchRusch public video] videos select failed", videoError);
      return null;
    }

    const url = video ? videoPlaybackUrl(video) : "";
    if (!video || !url) return null;

    const ownerIdForProfile = video.user_id?.trim() ?? "";
    const { row: profile, errorMessage: profileErrorMessage } = ownerIdForProfile
      ? await rpcFetchPublicPlayerProfileById(supabase, ownerIdForProfile)
      : { row: null, errorMessage: null };

    if (profileErrorMessage) {
      devError("[PitchRusch public video] player profile RPC failed", profileErrorMessage);
    }

    let userAvatarUrl: string | null = null;
    const ownerId = video.user_id?.trim();
    if (ownerId) {
      const { data: urow, error: uerr } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", ownerId)
        .maybeSingle();
      if (!uerr) {
        const u = typeof urow?.avatar_url === "string" ? urow.avatar_url.trim() : "";
        userAvatarUrl = u || null;
      }
    }

    let challenge: ChallengeRow | null = null;
    const challengeId = video.challenge_id?.trim();
    if (challengeId) {
      const { data: chRow, error: chError } = await withChallengeSelectFallback<ChallengeRow | null>((cols) =>
        supabase.from("challenges").select(cols).eq("id", challengeId).maybeSingle(),
      );

      if (chError) {
        devError("[PitchRusch public video] challenges select failed", chError);
      } else {
        challenge = parseChallengeRowLoose(chRow);
      }
    }

    let musicTrack: MusicTrackSummary | null = null;
    const tid = selectedMusicTrackIdFromVideo(video);
    if (tid) {
      const m = await fetchMusicTrackSummariesByIds(supabase, [tid]);
      musicTrack = m.get(tid) ?? null;
    }

    return {
      video,
      profile,
      userAvatarUrl,
      challenge,
      musicTrack,
    };
  },
);
