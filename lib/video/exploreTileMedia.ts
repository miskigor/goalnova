import type { VideoPlaybackFields } from "@/lib/video/videoPlaybackUrl";

/** DB / API fields used on explore tiles (some columns may exist before database.types is regenerated). */
export type VideoWithOptionalThumbnail = VideoPlaybackFields & {
  thumbnail_url?: string | null;
  poster_url?: string | null;
};

export function trimMediaUrl(s: string | null | undefined): string {
  return (s ?? "").trim();
}

export function isValidHttpMediaUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith("/")) return true;
  if (t.startsWith("//")) {
    try {
      return new URL(`https:${t}`).protocol === "https:";
    } catch {
      return false;
    }
  }
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Heuristic only for **thumbnail / poster** fields — never used to decide how to render
 * `video_url` / `processed_video_url` / `source_video_url` (those are always `<video>`).
 */
export function exploreThumbPosterUrlKind(url: string): "image" | "video" {
  const base = url.split(/[?#]/)[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v|mkv|ogv)$/i.test(base)) return "video";
  if (/\.m3u8$/i.test(base)) return "video";
  if (/\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)$/i.test(base)) return "image";
  if (/[?&]format=(webp|jpeg|jpg|png)/i.test(url)) return "image";
  return "image";
}

/**
 * First image URL from **thumbnail_url / poster_url only** (not avatar).
 * Used to detect “real tile art exists” for mobile Safari rules.
 */
export function exploreTileThumbnailOrPosterImageUrl(
  video: VideoWithOptionalThumbnail,
): string | undefined {
  for (const raw of [
    trimMediaUrl(video.thumbnail_url),
    trimMediaUrl(video.poster_url),
  ]) {
    if (!raw || !isValidHttpMediaUrl(raw)) continue;
    if (exploreThumbPosterUrlKind(raw) === "video") continue;
    return raw;
  }
  return undefined;
}

export function exploreTileHasRasterThumbnailOrPoster(
  video: VideoWithOptionalThumbnail,
): boolean {
  return exploreTileThumbnailOrPosterImageUrl(video) !== undefined;
}

/**
 * First static image URL for `<img>`: thumbnail or poster only (image-like).
 * Profile avatars are excluded so tiles with a video URL render `<video>` preview instead.
 */
export function exploreTilePrimaryImageUrl(
  video: VideoWithOptionalThumbnail,
  _profileAvatarUrl?: string | null,
): string | undefined {
  return exploreTileThumbnailOrPosterImageUrl(video);
}

/** Still frame for `<video poster>`: thumb/poster image, else profile avatar (does not block `<video>`). */
export function exploreTileVideoPosterAttribute(
  video: VideoWithOptionalThumbnail,
  profileAvatarUrl?: string | null,
): string | undefined {
  const thumbPoster = exploreTileThumbnailOrPosterImageUrl(video);
  if (thumbPoster) return thumbPoster;
  const avatar = trimMediaUrl(profileAvatarUrl);
  if (!avatar || !isValidHttpMediaUrl(avatar)) return undefined;
  if (exploreThumbPosterUrlKind(avatar) === "video") return undefined;
  return avatar;
}

/**
 * `<video src>` candidates for Explore (avoid grid autoplay; iOS shows poster until user plays elsewhere).
 * Order: **processed → source → video_url**, then video-like thumbnail/poster URLs if not already listed.
 */
export function exploreTileVideoSrcCandidates(
  video: VideoWithOptionalThumbnail,
): string[] {
  const out: string[] = [];
  const push = (u: string) => {
    if (!isValidHttpMediaUrl(u)) return;
    if (out.includes(u)) return;
    out.push(u);
  };

  for (const u of [
    trimMediaUrl(video.processed_video_url),
    trimMediaUrl(video.source_video_url),
    trimMediaUrl(video.video_url),
  ]) {
    if (u) push(u);
  }

  const thumb = trimMediaUrl(video.thumbnail_url);
  if (thumb && exploreThumbPosterUrlKind(thumb) === "video") push(thumb);

  const poster = trimMediaUrl(video.poster_url);
  if (poster && exploreThumbPosterUrlKind(poster) === "video") push(poster);

  return out;
}

/** True if the tile can show either an `<img>` (thumb/poster) or a `<video>`. */
export function exploreTileHasVisualMedia(
  video: VideoWithOptionalThumbnail,
  _profileAvatarUrl?: string | null,
): boolean {
  return (
    Boolean(exploreTilePrimaryImageUrl(video)) ||
    exploreTileVideoSrcCandidates(video).length > 0
  );
}

/** @deprecated Use exploreTileVideoPosterAttribute */
export function exploreTilePosterUrl(
  video: VideoWithOptionalThumbnail,
  profileAvatarUrl?: string | null,
): string | undefined {
  return exploreTileVideoPosterAttribute(video, profileAvatarUrl);
}

/** @deprecated Use exploreTileVideoSrcCandidates — kept for call sites that import the old name. */
export function exploreGridVideoSrcCandidates(
  video: VideoPlaybackFields,
): string[] {
  return exploreTileVideoSrcCandidates(video as VideoWithOptionalThumbnail);
}
