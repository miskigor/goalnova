import { devWarn } from "@/lib/devLog";

export type VideoPlaybackFields = {
  video_url: string | null;
  processed_video_url?: string | null;
  /** Original upload when a processed (music merge or playback encode) file exists separately. */
  source_video_url?: string | null;
};

/**
 * Put MP4/WebM ahead of iPhone `.mov` so the first download is streamable.
 */
export function preferStreamableVideoUrls(urls: string[]): string[] {
  const streamable: string[] = [];
  const other: string[] = [];
  for (const url of urls) {
    const base = url.split(/[?#]/)[0]?.toLowerCase() ?? "";
    if (base.endsWith(".mp4") || base.endsWith(".m4v") || base.endsWith(".webm")) {
      streamable.push(url);
    } else {
      other.push(url);
    }
  }
  return [...streamable, ...other];
}

export function videoPlaybackCandidates(video: VideoPlaybackFields): string[] {
  const processed = (video.processed_video_url ?? "").trim();
  const source = (video.source_video_url ?? "").trim();
  const primary = (video.video_url ?? "").trim();
  const list = [processed, primary, source].filter(Boolean);
  return preferStreamableVideoUrls(Array.from(new Set(list)));
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
  return preferStreamableVideoUrls(
    Array.from(new Set([primary, source, processed].filter(Boolean))),
  );
}

/**
 * Home / snap feed candidates:
 * Prefer the processed fast-start MP4, then the published URL, then the original upload.
 * `preferStreamableVideoUrls` still puts `.mp4` / `.webm` ahead of iPhone `.mov`.
 */
export function homeFeedPlaybackCandidates(video: VideoPlaybackFields): string[] {
  return videoPlaybackCandidates(video);
}

/**
 * Playback resolution order:
 * 1. `processed_video_url` — streamable H.264 MP4 (music merge or playback encode)
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
