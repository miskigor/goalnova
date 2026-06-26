/** Stable storage object path for a video still (`pitchrusch-videos` bucket). */
export function buildVideoThumbnailObjectPath(userId: string, videoId: string): string {
  const uid = userId.trim();
  const vid = videoId.trim();
  return `${uid}/thumbnails/${vid}.jpg`;
}

export function parseSupabasePublicStorageUrl(
  url: string,
): { bucket: string; path: string } | null {
  const trimmed = url.trim();
  const match = trimmed.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?|#|$)/);
  if (!match) return null;
  try {
    return {
      bucket: match[1],
      path: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}
