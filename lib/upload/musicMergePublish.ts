/**
 * Set to `true` to skip merge and block publish-with-music (emergency kill switch).
 * Re-enable merge attempts with `false` when the merge route is verified.
 */
export const TEMP_BLOCK_PUBLISH_WITH_MUSIC = false;

/**
 * Hard-disable publishing with library music (skips merge API; publish fails with a clear error).
 * Set `NEXT_PUBLIC_DISABLE_MUSIC_MERGE_PUBLISH=true` until server merge is verified in production.
 */
export function isMusicMergePublishDisabled(): boolean {
  if (typeof process === "undefined") return false;
  return process.env.NEXT_PUBLIC_DISABLE_MUSIC_MERGE_PUBLISH === "true";
}

/** True when publish-with-music must not proceed (temp gate or env disable). */
export function isPublishWithMusicBlocked(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ALLOW_PUBLISH_WITH_MUSIC === "true") {
    return false;
  }
  return TEMP_BLOCK_PUBLISH_WITH_MUSIC || isMusicMergePublishDisabled();
}
