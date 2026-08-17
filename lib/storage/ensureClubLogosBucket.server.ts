import type { SupabaseClient } from "@supabase/supabase-js";
import { CLUB_LOGO_BUCKET, CLUB_LOGO_MAX_BYTES } from "@/lib/storage/clubLogo";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

/** Service-role: create public `club-logos` bucket if Storage has no row yet. */
export async function ensureClubLogosBucket(
  service: SupabaseClient,
): Promise<{ ok: boolean; error?: string }> {
  const existing = await service.storage.getBucket(CLUB_LOGO_BUCKET);
  if (existing.data) {
    if (existing.data.public !== true) {
      const updated = await service.storage.updateBucket(CLUB_LOGO_BUCKET, { public: true });
      if (updated.error) {
        return { ok: false, error: updated.error.message };
      }
    }
    return { ok: true };
  }

  const created = await service.storage.createBucket(CLUB_LOGO_BUCKET, {
    public: true,
    fileSizeLimit: CLUB_LOGO_MAX_BYTES,
    allowedMimeTypes: ALLOWED_MIME,
  });
  if (created.error) {
    const message = created.error.message.toLowerCase();
    if (message.includes("already exists") || message.includes("duplicate")) {
      return { ok: true };
    }
    return { ok: false, error: created.error.message };
  }
  return { ok: true };
}
