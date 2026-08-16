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

const CONVERTIBLE_EXT = /\.(heic|heif|webp|gif|bmp|tif|tiff)$/i;
const CONVERTIBLE_MIME = /^image\/(heic|heif|webp|gif|bmp|tiff|x-heic)$/i;

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

function looksConvertible(file: File): boolean {
  const mime = (file.type ?? "").trim().toLowerCase();
  if (CONVERTIBLE_EXT.test(file.name) || CONVERTIBLE_MIME.test(mime)) return true;
  return mime.startsWith("image/") && mime !== "image/svg+xml";
}

async function rasterImageToJpeg(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    throw new Error("no_bitmap");
  }
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, bitmap.width);
  canvas.height = Math.max(1, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("no_ctx");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error("toBlob"))),
      "image/jpeg",
      0.88,
    );
  });
  const base = file.name.replace(/\.[^.]+$/, "").trim() || "document";
  return new File([blob], `${base}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/** Normalize phone photos (HEIC/WebP) to JPEG so the partnership form can submit. */
export async function prepareClubProofFile(
  file: File | null | undefined,
): Promise<{ ok: true; file: File } | { ok: false; error: ClubProofValidationError }> {
  const direct = validateClubProofFile(file);
  if (direct.ok) return direct;
  if (!file || direct.error === "required" || direct.error === "size") return direct;
  if (!looksConvertible(file)) return direct;

  try {
    const jpeg = await rasterImageToJpeg(file);
    return validateClubProofFile(jpeg);
  } catch {
    return { ok: false, error: "type" };
  }
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
