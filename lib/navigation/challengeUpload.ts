/**
 * Challenge → upload must use a single string `href`, not `{ pathname, query }`.
 * next-intl's Link forwards an object to `next/link` with a rewritten `pathname`;
 * relying on a separate `query` field has proven unreliable for the actual `<a href>`
 * and client navigations, which left `/upload` without `challenge_id` in the URL bar.
 */
export function challengeUploadHref(challengeId: string): string {
  return `/upload?challenge_id=${encodeURIComponent(challengeId)}`;
}
