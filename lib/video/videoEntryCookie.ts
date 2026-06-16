/** Short-lived cookie: compact public video layout when opened from Explore / Rankings. */
export const VIDEO_ENTRY_COOKIE = "gn-video-entry";

export type VideoEntrySource = "explore" | "rankings";

export function setVideoEntryCookie(source: VideoEntrySource) {
  if (typeof document === "undefined") return;
  document.cookie = `${VIDEO_ENTRY_COOKIE}=${source}; path=/; max-age=300; samesite=lax`;
}

export function parseVideoEntrySource(value: string | undefined): VideoEntrySource | null {
  if (value === "explore" || value === "rankings") return value;
  return null;
}
