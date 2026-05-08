/** Supabase Storage bucket for profile photos (public read). */
export const PROFILE_AVATAR_BUCKET = "profile-avatars";

/** Legacy bucket from earlier migrations; still recognized when deleting old URLs. */
export const LEGACY_PROFILE_AVATAR_BUCKET = "player-avatars";

/** Supabase returns this when `storage.buckets` has no row for the bucket (migration not applied). */
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

/** Max upload size for profile avatars (must match UI copy / i18n). */
export const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_AVATAR_MAX_MB = 5;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/** iOS often leaves `file.type` empty; infer from extension. */
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

export function buildProfileAvatarObjectPath(userId: string, file: File): string {
  const safeId = userId.trim();
  const ext = extFromFile(file);
  return `${safeId}/avatar-${Date.now()}.${ext}`;
}

export function validateProfileAvatarFile(file: File): string | null {
  if (!ALLOWED.has(normalizedImageMime(file))) {
    return "type";
  }
  if (file.size > PROFILE_AVATAR_MAX_BYTES) {
    return "size";
  }
  return null;
}

/** Strip `/object/public/{bucket}/` prefix from a Supabase public object URL. */
export function storageObjectPathFromPublicUrl(
  publicUrl: string,
  bucket: string = PROFILE_AVATAR_BUCKET,
): string | null {
  const u = publicUrl.trim();
  if (!u) return null;
  try {
    const parsed = new URL(u);
    const needle = `/object/public/${bucket}/`;
    const i = parsed.pathname.indexOf(needle);
    if (i === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(i + needle.length));
  } catch {
    return null;
  }
}

/** Infer bucket id from a Supabase public object URL, if present. */
export function storageBucketFromPublicUrl(publicUrl: string): string | null {
  const u = publicUrl.trim();
  if (!u) return null;
  try {
    const parsed = new URL(u);
    const m = parsed.pathname.match(/\/object\/public\/([^/]+)\//);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Resolve object path for delete; tries current then legacy bucket names. */
export function storageObjectPathFromAnyProfileAvatarUrl(publicUrl: string): {
  bucket: string;
  path: string;
} | null {
  const u = publicUrl.trim();
  if (!u) return null;
  const inferred = storageBucketFromPublicUrl(u);
  const candidates = inferred
    ? [inferred]
    : [PROFILE_AVATAR_BUCKET, LEGACY_PROFILE_AVATAR_BUCKET];
  for (const bucket of candidates) {
    const path = storageObjectPathFromPublicUrl(u, bucket);
    if (path) return { bucket, path };
  }
  return null;
}
