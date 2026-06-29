/** Supabase Storage bucket for club profile logos (public read). */
export const CLUB_LOGO_BUCKET = "club-logos";

export const CLUB_LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const CLUB_LOGO_MAX_MB = 5;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function normalizedImageMime(file: File): string {
  let t = (file.type || "").toLowerCase().trim();
  if (t === "image/jpg") t = "image/jpeg";
  if (t) return t;
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".jpe")) {
    return "image/jpeg";
  }
  return "";
}

function extFromFile(file: File): string {
  const t = normalizedImageMime(file);
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  return "jpg";
}

export function buildClubLogoObjectPath(clubId: string, file: File): string {
  const safeId = clubId.trim();
  const ext = extFromFile(file);
  return `${safeId}/logo-${Date.now()}.${ext}`;
}

export function validateClubLogoFile(file: File): string | null {
  if (!ALLOWED.has(normalizedImageMime(file))) {
    return "type";
  }
  if (file.size > CLUB_LOGO_MAX_BYTES) {
    return "size";
  }
  return null;
}

export function storageObjectPathFromClubLogoUrl(publicUrl: string): string | null {
  const u = publicUrl.trim();
  if (!u) return null;
  try {
    const parsed = new URL(u);
    const needle = `/object/public/${CLUB_LOGO_BUCKET}/`;
    const i = parsed.pathname.indexOf(needle);
    if (i === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(i + needle.length));
  } catch {
    return null;
  }
}

export function isStorageBucketNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { message?: string; name?: string };
  const m = String(e.message ?? "").toLowerCase();
  if (m.includes("bucket not found")) return true;
  if (e.name === "StorageApiError" && m.includes("not found") && m.includes("bucket")) {
    return true;
  }
  return false;
}
