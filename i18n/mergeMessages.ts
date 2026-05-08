/**
 * Deep-merge locale messages over English so missing keys never throw at runtime.
 * Locale values win; any key absent in the locale falls back to English.
 */
export function mergeMessagesWithFallback(
  fallback: Record<string, unknown>,
  localeMessages: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const keys = new Set([
    ...Object.keys(fallback),
    ...Object.keys(localeMessages),
  ]);
  for (const key of keys) {
    const fb = fallback[key];
    const loc = localeMessages[key];
    if (loc === undefined) {
      result[key] = fb;
      continue;
    }
    if (
      fb !== null &&
      typeof fb === "object" &&
      !Array.isArray(fb) &&
      loc !== null &&
      typeof loc === "object" &&
      !Array.isArray(loc)
    ) {
      result[key] = mergeMessagesWithFallback(
        fb as Record<string, unknown>,
        loc as Record<string, unknown>,
      );
    } else {
      result[key] = loc;
    }
  }
  return result;
}
