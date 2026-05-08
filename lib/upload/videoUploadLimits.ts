/**
 * Client-side video upload limits (must stay at or below Supabase Storage bucket max).
 * Override with NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB (integer, megabytes) if bucket policy differs.
 */
function readMaxMbFromEnv(): number {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB?.trim()
      : undefined;
  if (!raw) return 250;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 5000) : 250;
}

export const VIDEO_UPLOAD_MAX_MB = readMaxMbFromEnv();
export const VIDEO_UPLOAD_MAX_BYTES = VIDEO_UPLOAD_MAX_MB * 1024 * 1024;

export function formatVideoFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Maps Supabase / network errors so we never show raw provider strings for size limits. */
export function isStorageOrUploadSizeLimitError(err: unknown): boolean {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message)
      : typeof err === "string"
        ? err
        : "";
  const lower = msg.toLowerCase();
  return (
    lower.includes("maximum allowed size") ||
    lower.includes("exceeded the maximum") ||
    lower.includes("file too large") ||
    lower.includes("entity too large") ||
    lower.includes("payload too large") ||
    lower.includes("request entity too large") ||
    lower.includes("413") ||
    lower.includes("object exceeded")
  );
}
