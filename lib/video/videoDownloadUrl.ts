import type { VideoPlaybackFields } from "@/lib/video/videoPlaybackUrl";

/** Admin download: prefer original upload when stored separately. */
export function videoDownloadUrl(video: VideoPlaybackFields): string {
  const source = (video.source_video_url ?? "").trim();
  const processed = (video.processed_video_url ?? "").trim();
  const primary = (video.video_url ?? "").trim();
  if (source.length > 0) return source;
  if (processed.length > 0) return processed;
  return primary;
}
