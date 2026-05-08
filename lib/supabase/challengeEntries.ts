import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

type Client = SupabaseClient<Database>;

/**
 * DB: `challenge_entries_challenge_id_video_id_unique` → UNIQUE (challenge_id, video_id).
 * Supabase upsert must use this exact `onConflict` string.
 *
 * A video may only appear in one challenge (`videos.challenge_id`). With a composite unique key,
 * moving a video to a new challenge would leave a stale row for the old pair unless we remove
 * prior rows for that `video_id` before upserting the new `(challenge_id, video_id)`.
 *
 * We do **not** use UNIQUE (user_id, challenge_id): the product allows multiple videos from the
 * same user in one challenge.
 */
const CHALLENGE_ENTRIES_UPSERT_ON_CONFLICT = "challenge_id,video_id" as const;

async function replaceChallengeEntryForVideo(
  client: Client,
  params: { challengeId: string; videoId: string; userId: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cid = params.challengeId.trim();
  const vid = params.videoId.trim();
  const uid = params.userId.trim();

  const { error: delErr } = await client
    .from("challenge_entries")
    .delete()
    .eq("video_id", vid);

  if (delErr) {
    logFullSupabaseError(
      "[challengeEntries] delete entries for video before upsert",
      delErr,
      { videoId: vid },
    );
    return { ok: false, error: delErr.message ?? "delete_failed" };
  }

  const { error } = await client.from("challenge_entries").upsert(
    {
      challenge_id: cid,
      video_id: vid,
      user_id: uid,
    },
    { onConflict: CHALLENGE_ENTRIES_UPSERT_ON_CONFLICT },
  );

  if (error) {
    logFullSupabaseError("[challengeEntries] upsert entry", error, {
      videoId: vid,
      challengeId: cid,
    });
    return { ok: false, error: error.message ?? "entry_failed" };
  }

  return { ok: true };
}

/**
 * After inserting a video with `challenge_id` set, record the junction row (no extra video update).
 */
export async function recordChallengeEntryForNewVideo(
  client: Client,
  params: {
    challengeId: string;
    videoId: string;
    userId: string;
  },
): Promise<void> {
  const cid = params.challengeId?.trim();
  const vid = params.videoId?.trim();
  const uid = params.userId?.trim();
  if (!cid || !vid || !uid) return;

  const res = await replaceChallengeEntryForVideo(client, {
    challengeId: cid,
    videoId: vid,
    userId: uid,
  });

  if (!res.ok) {
    logFullSupabaseError(
      "[challengeEntries] recordChallengeEntryForNewVideo",
      new Error(res.error),
      { challengeId: cid, videoId: vid },
    );
  }
}
