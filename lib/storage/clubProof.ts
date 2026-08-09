/** Club verification proof uploads (PDF / JPEG / PNG). */
export const CLUB_VERIFICATION_DOCUMENTS_BUCKET = "club-verification-documents" as const;

export const CLUB_PROOF_MAX_BYTES = 10 * 1024 * 1024;

const ACCEPTED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const ACCEPTED_EXT = /\.(pdf|jpe?g|png)$/i;

export type ClubProofValidationError = "required" | "type" | "size";

export function validateClubProofFile(
  file: File | null | undefined,
): { ok: true; file: File } | { ok: false; error: ClubProofValidationError } {
  if (!file || file.size === 0) {
    return { ok: false, error: "required" };
  }
  if (file.size > CLUB_PROOF_MAX_BYTES) {
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

function sanitizeOriginalFileName(name: string): string {
  const base = name.replace(/[/\\]/g, "_").trim();
  return base.slice(0, 180) || "document";
}

export function buildClubProofStoragePath(userId: string, originalFileName: string): string {
  const safe = sanitizeOriginalFileName(originalFileName);
  return `${userId}/${Date.now()}-${safe}`;
}

export function inferClubProofContentType(file: File): string {
  const mime = (file.type ?? "").trim().toLowerCase();
  if (mime && ACCEPTED_MIME.has(mime)) {
    return mime === "image/jpg" ? "image/jpeg" : mime;
  }
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}
