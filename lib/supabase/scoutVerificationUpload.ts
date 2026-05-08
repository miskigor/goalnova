import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export const SCOUT_VERIFICATION_DOCUMENTS_BUCKET =
  "scout-verification-documents" as const;

/** Max file size for proof uploads (must match UI validation). */
export const SCOUT_PROOF_MAX_BYTES = 10 * 1024 * 1024;

const ACCEPTED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const ACCEPTED_EXT = /\.(pdf|jpe?g|png)$/i;

export type ScoutProofValidationError =
  | "required"
  | "type"
  | "size";

/**
 * Client-side validation for proof files (PDF / JPEG / PNG, ≤10MB).
 */
export function validateScoutProofFile(
  file: File | null | undefined,
): { ok: true; file: File } | { ok: false; error: ScoutProofValidationError } {
  if (!file || file.size === 0) {
    return { ok: false, error: "required" };
  }
  if (file.size > SCOUT_PROOF_MAX_BYTES) {
    return { ok: false, error: "size" };
  }
  if (!ACCEPTED_EXT.test(file.name)) {
    return { ok: false, error: "type" };
  }
  const mime = (file.type ?? "").trim().toLowerCase();
  if (mime !== "" && !ACCEPTED_MIME.has(mime)) {
    return { ok: false, error: "type" };
  }
  return { ok: true, file };
}

/** Avoid path traversal / extra segments; keep rest of `file.name` as-is. */
function sanitizeOriginalFileName(name: string): string {
  const base = name.replace(/[/\\]/g, "_").trim();
  return base.slice(0, 180) || "document";
}

/**
 * Builds `userId/timestamp-fileName` path within the private bucket.
 */
export function buildScoutProofStoragePath(
  userId: string,
  originalFileName: string,
): string {
  const safe = sanitizeOriginalFileName(originalFileName);
  return `${userId}/${Date.now()}-${safe}`;
}

/** MIME for Storage + multipart part (some browsers leave `file.type` empty). */
export function inferScoutProofContentType(file: File): string {
  const mime = (file.type ?? "").trim().toLowerCase();
  if (mime && ACCEPTED_MIME.has(mime)) {
    return mime === "image/jpg" ? "image/jpeg" : mime;
  }
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}

/**
 * Ensures the uploaded `Blob` carries a correct `type` for Supabase Storage multipart uploads.
 */
function fileBodyForStorageUpload(file: File, contentType: string): File {
  const mime = (file.type ?? "").trim().toLowerCase();
  const normalizedMime = mime === "image/jpg" ? "image/jpeg" : mime;
  if (
    normalizedMime &&
    ACCEPTED_MIME.has(normalizedMime) &&
    normalizedMime === contentType
  ) {
    return file;
  }
  return new File([file], file.name, {
    type: contentType,
    lastModified: file.lastModified,
  });
}

/** Log every field Supabase Storage errors usually expose (avoids empty `{}`). */
function logScoutProofStorageFailure(
  err: unknown,
  context: Record<string, unknown>,
) {
  const e =
    err && typeof err === "object"
      ? (err as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  logFullSupabaseError(
    "[scoutVerificationUpload] storage.upload (scout-verification-documents)",
    err,
    {
      ...context,
      errorName: typeof e.name === "string" ? e.name : null,
      message:
        typeof e.message === "string" ? e.message : String(e.message ?? err),
      statusCode: e.statusCode ?? e.status ?? null,
      status: e.status ?? null,
    },
  );
}

export type ScoutProofUploadFailure = {
  /** Short message safe to show in UI (from Storage API when available). */
  userMessage: string;
  /** Original storage/client error when available. */
  raw: unknown;
};

/**
 * Uploads proof via `supabase.storage.from('scout-verification-documents').upload(...)`.
 * Uses multipart FormData internally (same as @supabase/storage-js); raw XHR + wrong Content-Type causes HTTP 400.
 */
export async function uploadScoutVerificationProofDocument(
  userId: string,
  file: File,
  onProgress: (percent: number) => void = () => {},
): Promise<
  | { ok: true; storagePath: string; displayName: string; contentType: string }
  | { ok: false; error: ScoutProofUploadFailure }
> {
  const storagePath = buildScoutProofStoragePath(userId, file.name);
  const contentType = inferScoutProofContentType(file);
  const body = fileBodyForStorageUpload(file, contentType);

  onProgress(0);

  const { error } = await supabase.storage
    .from(SCOUT_VERIFICATION_DOCUMENTS_BUCKET)
    .upload(storagePath, body, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    });

  if (error) {
    onProgress(0);
    logScoutProofStorageFailure(error, {
      userId,
      bucket: SCOUT_VERIFICATION_DOCUMENTS_BUCKET,
      storagePath,
      contentType,
      fileName: file.name,
      fileSize: file.size,
    });

    const msg =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : "Storage upload failed";

    return {
      ok: false,
      error: {
        userMessage: msg,
        raw: error,
      },
    };
  }

  onProgress(100);

  return {
    ok: true,
    storagePath,
    displayName: file.name,
    contentType,
  };
}
