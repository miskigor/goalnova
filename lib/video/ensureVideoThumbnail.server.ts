import { join } from "node:path";
import { promises as fs } from "node:fs";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import {
  LEGACY_VIDEO_STORAGE_BUCKET,
  VIDEO_STORAGE_BUCKET,
} from "@/lib/constants/storageBuckets";
import { devWarn } from "@/lib/devLog";
import { extractVideoThumbnailJpeg } from "@/lib/video/ffmpegThumbnail";
import { withTempDir, downloadToFile } from "@/lib/video/ffmpegMerge";
import {
  buildVideoThumbnailObjectPath,
  parseSupabasePublicStorageUrl,
} from "@/lib/video/videoThumbnailPaths";
import { videoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";
import { exploreTileThumbnailOrPosterImageUrl } from "@/lib/video/exploreTileMedia";

type VideoRow = Pick<
  Database["public"]["Tables"]["videos"]["Row"],
  "id" | "user_id" | "video_url" | "processed_video_url" | "source_video_url" | "thumbnail_url" | "poster_url"
>;

function pickStorageSource(video: VideoRow): { bucket: string; path: string } | null {
  const candidates = [
    video.processed_video_url,
    video.video_url,
    video.source_video_url,
  ];
  for (const raw of candidates) {
    const url = typeof raw === "string" ? raw.trim() : "";
    if (!url) continue;
    const parsed = parseSupabasePublicStorageUrl(url);
    if (parsed) return parsed;
  }
  return null;
}

function publicStorageUrl(supabaseUrl: string, bucket: string, path: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Server-side thumbnail generation for videos missing `thumbnail_url`.
 * Safe to call repeatedly — no-op when a raster thumb already exists.
 */
export async function ensureVideoThumbnailForRow(
  video: VideoRow,
): Promise<string | null> {
  const existing = exploreTileThumbnailOrPosterImageUrl(video);
  if (existing) return existing;

  const videoId = video.id?.trim();
  const userId = video.user_id?.trim();
  if (!videoId || !userId) return null;

  const supabase = createServiceRoleClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabase || !supabaseUrl) return null;

  const storage = pickStorageSource(video);
  const playbackUrl = videoPlaybackUrl(video);
  if (!playbackUrl) return null;

  const thumbPath = buildVideoThumbnailObjectPath(userId, videoId);
  const bucket =
    storage?.bucket === LEGACY_VIDEO_STORAGE_BUCKET ||
    storage?.bucket === VIDEO_STORAGE_BUCKET
      ? storage.bucket
      : VIDEO_STORAGE_BUCKET;

  try {
    const thumbnailUrl = await withTempDir(async (dir) => {
      const localVideo = join(dir, "source.mp4");
      const localThumb = join(dir, "thumb.jpg");

      if (storage) {
        const { data, error } = await supabase.storage.from(storage.bucket).download(storage.path);
        if (error || !data) {
          await downloadToFile(playbackUrl, localVideo);
        } else {
          await fs.writeFile(localVideo, Buffer.from(await data.arrayBuffer()));
        }
      } else {
        await downloadToFile(playbackUrl, localVideo);
      }

      await extractVideoThumbnailJpeg(localVideo, localThumb, 1);
      const thumbBytes = await fs.readFile(localThumb);

      const { error: uploadError } = await supabase.storage.from(bucket).upload(thumbPath, thumbBytes, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "31536000",
      });
      if (uploadError) {
        devWarn("[ensureVideoThumbnail] storage upload failed", {
          videoId,
          message: uploadError.message,
        });
        return null;
      }

      return publicStorageUrl(supabaseUrl, bucket, thumbPath);
    });

    if (!thumbnailUrl) return null;

    const { error: updateError } = await supabase
      .from("videos")
      .update({ thumbnail_url: thumbnailUrl })
      .eq("id", videoId);

    if (updateError) {
      devWarn("[ensureVideoThumbnail] videos update failed", {
        videoId,
        message: updateError.message,
      });
      return thumbnailUrl;
    }

    return thumbnailUrl;
  } catch (err) {
    devWarn("[ensureVideoThumbnail] generation failed", {
      videoId,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function ensureVideoThumbnailById(videoId: string): Promise<string | null> {
  const id = videoId.trim();
  if (!id) return null;

  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("videos")
    .select("id,user_id,video_url,processed_video_url,source_video_url,thumbnail_url,poster_url")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return ensureVideoThumbnailForRow(data);
}
