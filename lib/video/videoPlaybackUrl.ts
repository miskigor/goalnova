import { devWarn } from "@/lib/devLog";

export type VideoPlaybackFields = {
  video_url: string | null;
  processed_video_url?: string | null;
  /** Pre-merge / original upload when a processed (e.g. music) file exists separately. */
  source_video_url?: string | null;
};

export function videoPlaybackCandidates(video: VideoPlaybackFields): string[] {
  const processed = (video.processed_video_url ?? "").trim();
  const source = (video.source_video_url ?? "").trim();
  const primary = (video.video_url ?? "").trim();
  const list = [processed, source, primary].filter(Boolean);
  return Array.from(new Set(list));
}

/**
 * Rankings / small inline previews: prefer **`video_url` first**, then source, then processed.
 * Merged `processed` files often stay black on iOS until heavy decode; canonical URL usually paints faster.
 * Full playback on `/video/[id]` still uses {@link videoPlaybackUrl}.
 */
export function rankingsPreviewVideoCandidates(video: VideoPlaybackFields): string[] {
  const processed = (video.processed_video_url ?? "").trim();
  const source = (video.source_video_url ?? "").trim();
  const primary = (video.video_url ?? "").trim();
  return Array.from(new Set([primary, source, processed].filter(Boolean)));
}

/**
 * Home / snap feed candidates:
 * Prefer **`video_url` first** (often starts decoding faster on mobile), then merged `processed`,
 * then `source` — keeps fallbacks so broken links do not black the slide.
 * (See `videoPlaybackUrl` for single-URL “canonical” choice elsewhere.)
 */
export function homeFeedPlaybackCandidates(video: VideoPlaybackFields): string[] {
  const processed = (video.processed_video_url ?? "").trim();
  const primary = (video.video_url ?? "").trim();
  return Array.from(new Set([primary, processed].filter(Boolean)));
}

/**
 * Playback resolution order:
 * 1. `processed_video_url` — merged asset (e.g. with music); always preferred when set
 * 2. `source_video_url` — original upload when processed is absent
 * 3. `video_url` — canonical published file (legacy / single-URL rows)
 */
export function videoPlaybackUrl(video: VideoPlaybackFields): string {
  const processed = (video.processed_video_url ?? "").trim();
  const source = (video.source_video_url ?? "").trim();
  const primary = (video.video_url ?? "").trim();

  if (
    process.env.NODE_ENV === "development" &&
    processed.length > 0 &&
    primary.length > 0 &&
    processed !== primary
  ) {
    devWarn(
      "[PitchRusch] Playback uses processed_video_url (differs from video_url).",
    );
  }

  if (processed.length > 0) return processed;
  if (source.length > 0) return source;
  return primary;
}

export function hasVideoPlaybackUrl(video: VideoPlaybackFields): boolean {
  return videoPlaybackUrl(video).length > 0;
}
