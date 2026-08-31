import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  LEGACY_VIDEO_STORAGE_BUCKET,
  VIDEO_STORAGE_BUCKET,
} from "@/lib/constants/storageBuckets";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import {
  PLAYBACK_COPY_MAX_BYTES,
  downloadStorageObjectToFile,
  downloadToFile,
  encodeToStreamableMp4,
  withTempDir,
} from "@/lib/video/ffmpegMerge";
import { parseSupabasePublicStorageUrl } from "@/lib/video/videoThumbnailPaths";

function publicVideoUrl(supabaseUrl: string, bucket: string, path: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

function isMp4LikeUrl(url: string): boolean {
  const base = url.split(/[?#]/)[0]?.toLowerCase() ?? "";
  return base.endsWith(".mp4") || base.endsWith(".m4v") || base.endsWith(".webm");
}

async function headContentLength(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!res.ok) return null;
    const n = Number(res.headers.get("content-length") ?? "");
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function pickEncodeSource(video: {
  video_url: string | null;
  processed_video_url: string | null;
  source_video_url: string | null;
  selected_music_track_id?: string | null;
}): string {
  const processed = (video.processed_video_url ?? "").trim();
  const source = (video.source_video_url ?? "").trim();
  const primary = (video.video_url ?? "").trim();
  const hasMusic = Boolean((video.selected_music_track_id ?? "").trim());
  if (hasMusic) return processed || primary || source;
  return source || primary || processed;
}

/**
 * Transcode a published clip into a small fast-start H.264 MP4 and store it as
 * `processed_video_url`. No-ops when the current playback URL is already a small MP4.
 */
export async function ensurePlaybackVideoById(
  videoId: string,
): Promise<{ processed_video_url: string; skipped: boolean } | null> {
  const id = videoId.trim();
  if (!id) return null;

  const supabase = createServiceRoleClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabase || !supabaseUrl) return null;

  const { data: video, error } = await supabase
    .from("videos")
    .select(
      "id,user_id,video_url,processed_video_url,source_video_url,selected_music_track_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !video?.user_id) return null;

  const currentPlayback = (
    (video.processed_video_url ?? "").trim() ||
    (video.video_url ?? "").trim()
  );
  if (currentPlayback && isMp4LikeUrl(currentPlayback)) {
    const bytes = await headContentLength(currentPlayback);
    if (bytes != null && bytes <= PLAYBACK_COPY_MAX_BYTES) {
      return { processed_video_url: currentPlayback, skipped: true };
    }
  }

  const inputUrl = pickEncodeSource(video);
  if (!inputUrl) return null;

  const parsed = parseSupabasePublicStorageUrl(inputUrl);
  const bucket =
    parsed?.bucket === LEGACY_VIDEO_STORAGE_BUCKET ||
    parsed?.bucket === VIDEO_STORAGE_BUCKET
      ? parsed.bucket
      : VIDEO_STORAGE_BUCKET;

  const processedVideoUrl = await withTempDir(async (dir) => {
    const videoLocal = join(dir, "input.bin");
    const outLocal = join(dir, "out.mp4");

    if (parsed) {
      await downloadStorageObjectToFile(supabase, parsed.bucket, parsed.path, videoLocal);
    } else {
      await downloadToFile(inputUrl, videoLocal);
    }

    const fileStat = await stat(videoLocal);
    if (fileStat.size < 64) throw new Error("Uploaded video is empty");

    await encodeToStreamableMp4(videoLocal, outLocal);
    const buf = await readFile(outLocal);
    if (buf.length < 64) throw new Error("Encoded output is empty");

    const playbackStoragePath = `${video.user_id}/playback-${Date.now()}.mp4`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(
      playbackStoragePath,
      buf,
      {
        contentType: "video/mp4",
        upsert: true,
        cacheControl: "31536000",
      },
    );
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

    return publicVideoUrl(supabaseUrl, bucket, playbackStoragePath).trim();
  });

  if (!processedVideoUrl) return null;

  const { error: updateError } = await supabase
    .from("videos")
    .update({ processed_video_url: processedVideoUrl })
    .eq("id", id);

  if (updateError) {
    throw new Error(`videos update failed: ${updateError.message}`);
  }

  return { processed_video_url: processedVideoUrl, skipped: false };
}
