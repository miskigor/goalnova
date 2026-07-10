import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { videoDownloadUrl } from "@/lib/video/videoDownloadUrl";

type VideoDownloadRow = Pick<
  Database["public"]["Tables"]["videos"]["Row"],
  "id" | "user_id" | "video_url" | "processed_video_url" | "source_video_url"
>;

export function parseSupabaseStoragePublicUrl(
  publicUrl: string,
): { bucket: string; path: string } | null {
  try {
    const pathname = new URL(publicUrl).pathname;
    const match = pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return {
      bucket: match[1],
      path: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

function downloadFilename(videoId: string, publicUrl: string): string {
  const extMatch = /\.([a-z0-9]{2,5})(?:$|[?#])/i.exec(publicUrl);
  const ext = extMatch?.[1]?.toLowerCase() ?? "mp4";
  return `pitchrusch-${videoId.slice(0, 8)}.${ext}`;
}

export async function resolveAdminVideoDownload(
  service: SupabaseClient<Database>,
  videoId: string,
): Promise<
  | {
      ok: true;
      url: string;
      filename: string;
      ownerUserId: string;
    }
  | { ok: false; reason: "not_found" | "no_url" | "signed_url_failed" }
> {
  const { data: video, error } = await service
    .from("videos")
    .select("id, user_id, video_url, processed_video_url, source_video_url")
    .eq("id", videoId)
    .maybeSingle();

  if (error || !video) {
    return { ok: false, reason: "not_found" };
  }

  const row = video as VideoDownloadRow;
  const publicUrl = videoDownloadUrl(row);
  if (!publicUrl) {
    return { ok: false, reason: "no_url" };
  }

  const filename = downloadFilename(videoId, publicUrl);
  const parsed = parseSupabaseStoragePublicUrl(publicUrl);
  if (!parsed) {
    return {
      ok: true,
      url: publicUrl,
      filename,
      ownerUserId: row.user_id,
    };
  }

  const { data, error: signError } = await service.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, 3600, { download: filename });

  if (signError || !data?.signedUrl) {
    return { ok: false, reason: "signed_url_failed" };
  }

  return {
    ok: true,
    url: data.signedUrl,
    filename,
    ownerUserId: row.user_id,
  };
}
