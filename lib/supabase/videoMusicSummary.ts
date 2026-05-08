import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type MusicTrackSummary = {
  id: string;
  title: string;
  artist: string;
};

/**
 * Normalizes `videos.selected_music_track_id` from API/row data (optional column, string | null).
 */
export function selectedMusicTrackIdFromVideo(
  video: { selected_music_track_id?: string | null } | null | undefined,
): string | null {
  const raw = video?.selected_music_track_id;
  if (raw == null || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Batch-load display fields for video cards (active tracks only for public/anon).
 */
export async function fetchMusicTrackSummariesByIds(
  client: SupabaseClient<Database>,
  ids: (string | null | undefined)[],
): Promise<Map<string, MusicTrackSummary>> {
  const unique = [
    ...new Set(
      ids
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean),
    ),
  ];
  const out = new Map<string, MusicTrackSummary>();
  if (unique.length === 0) return out;

  const { data, error } = await client
    .from("music_tracks")
    .select("id,title,artist")
    .in("id", unique)
    .eq("active", true);

  if (error || !data) return out;

  for (const row of data) {
    out.set(row.id, {
      id: row.id,
      title: row.title,
      artist: row.artist,
    });
  }
  return out;
}
