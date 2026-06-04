/** Maps internal/client error codes to stable API-style codes for UI and logs. */

const PERMISSION_ERRORS = new Set([
  "premium_required",
  "scout_access_denied",
  "not_video_owner",
  "not_authenticated",
]);

export function normalizeAiErrorCode(code: string): string {
  const key = code.trim();
  if (!key) return "unknown";
  if (key === "analysis_timeout" || key === "client_timeout") {
    return "timeout";
  }
  if (PERMISSION_ERRORS.has(key)) {
    return "permission_denied";
  }
  if (key.startsWith("ai_analyze_http_403")) {
    return "permission_denied";
  }
  if (key.startsWith("ai_analyze_http_402")) {
    return "permission_denied";
  }
  return key;
}
