/**
 * Parse object path inside a bucket from a Supabase Storage *public* object URL.
 * Example pathname: /storage/v1/object/public/pitchrusch-videos/userId/123-file.mp4
 */
export function parseStoragePathFromPublicObjectUrl(
  publicUrl: string,
  bucket: string
): string | null {
  const trimmed = publicUrl.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const marker = `/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export function isLikelyHttpUrl(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://");
}
