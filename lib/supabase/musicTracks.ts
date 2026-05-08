import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type MusicTrackRow = Database["public"]["Tables"]["music_tracks"]["Row"];

export async function fetchActiveMusicTracks(
  client: SupabaseClient<Database>,
): Promise<{ tracks: MusicTrackRow[]; error: string | null }> {
  const { data, error } = await client
    .from("music_tracks")
    .select("*")
    .eq("active", true)
    .order("title", { ascending: true });

  if (error) {
    return { tracks: [], error: error.message };
  }
  return { tracks: data ?? [], error: null };
}

/** Staff: all tracks for admin UI (including inactive). */
export async function fetchAllMusicTracksForAdmin(
  client: SupabaseClient<Database>,
): Promise<{ tracks: MusicTrackRow[]; error: string | null }> {
  const { data, error } = await client
    .from("music_tracks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { tracks: [], error: error.message };
  }
  return { tracks: data ?? [], error: null };
}

export function formatTrackDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
