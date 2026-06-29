"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { rpcClubUpdateLogo } from "@/lib/supabase/clubs";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  CLUB_LOGO_BUCKET,
  CLUB_LOGO_MAX_MB,
  buildClubLogoObjectPath,
  isStorageBucketNotFoundError,
  normalizedImageMime,
  storageObjectPathFromClubLogoUrl,
  validateClubLogoFile,
} from "@/lib/storage/clubLogo";

type Props = {
  clubId: string;
  clubName: string;
  logoUrl: string | null;
  onLogoUrlChange: (url: string | null) => void;
};

async function removeStoredFile(publicUrl: string) {
  const path = storageObjectPathFromClubLogoUrl(publicUrl);
  if (!path) return;
  const { error } = await supabase.storage.from(CLUB_LOGO_BUCKET).remove([path]);
  if (error) {
    logFullSupabaseError("[ClubLogoEditor] storage remove", error, { path });
  }
}

export function ClubLogoEditor({ clubId, clubName, logoUrl, onLogoUrlChange }: Props) {
  const t = useTranslations("clubs");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
  }

  function setPreviewFromFile(file: File) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const u = URL.createObjectURL(file);
    previewRef.current = u;
    setPreviewUrl(u);
  }

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
    };
  }, []);

  async function onPickFiles(files: FileList | null) {
    setLocalError(null);
    const file = files?.[0];
    if (!file) return;

    const bad = validateClubLogoFile(file);
    if (bad === "type") {
      setLocalError(t("clubLogoInvalidType"));
      return;
    }
    if (bad === "size") {
      setLocalError(t("clubLogoTooLarge", { maxMb: CLUB_LOGO_MAX_MB }));
      return;
    }

    setPreviewFromFile(file);
    setBusy(true);
    const path = buildClubLogoObjectPath(clubId, file);
    const prev = logoUrl?.trim() || null;
    const contentType = normalizedImageMime(file) || "image/jpeg";

    try {
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from(CLUB_LOGO_BUCKET)
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType,
        });

      if (uploadError || !uploaded?.path) {
        setLocalError(
          uploadError && isStorageBucketNotFoundError(uploadError)
            ? t("clubLogoBucketMissing")
            : t("clubLogoUploadFailed"),
        );
        if (uploadError) {
          logFullSupabaseError("[ClubLogoEditor] storage.upload", uploadError, { path });
        }
        clearPreview();
        return;
      }

      const { data: pub } = supabase.storage.from(CLUB_LOGO_BUCKET).getPublicUrl(uploaded.path);
      const publicUrl = pub.publicUrl;

      const result = await rpcClubUpdateLogo(clubId, publicUrl);
      if (!result.ok) {
        setLocalError(result.error ?? t("clubLogoUploadFailed"));
        await supabase.storage.from(CLUB_LOGO_BUCKET).remove([uploaded.path]);
        clearPreview();
        return;
      }

      if (prev) await removeStoredFile(prev);
      onLogoUrlChange(publicUrl);
      setLocalError(null);
      clearPreview();
    } catch (e) {
      logFullSupabaseError("[ClubLogoEditor] upload", e);
      setLocalError(t("clubLogoUploadFailed"));
      try {
        await supabase.storage.from(CLUB_LOGO_BUCKET).remove([path]);
      } catch {
        /* ignore */
      }
      clearPreview();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setLocalError(null);
    const prev = logoUrl?.trim() || null;
    if (!prev && !previewUrl) return;
    if (!prev && previewUrl) {
      clearPreview();
      return;
    }

    setBusy(true);
    try {
      const result = await rpcClubUpdateLogo(clubId, null);
      if (!result.ok) {
        setLocalError(result.error ?? t("clubLogoUploadFailed"));
        return;
      }
      await removeStoredFile(prev!);
      onLogoUrlChange(null);
      clearPreview();
    } catch (e) {
      logFullSupabaseError("[ClubLogoEditor] remove", e);
      setLocalError(t("clubLogoUploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const displayUrl = previewUrl || logoUrl;

  return (
    <section className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4">
      <h2 className="text-sm font-semibold text-gn-text">{t("clubLogoTitle")}</h2>
      <p className="mt-1 text-xs text-gn-text-secondary">{t("clubLogoHint", { maxMb: CLUB_LOGO_MAX_MB })}</p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gn-border-subtle bg-gn-surface-elevated">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl" aria-hidden>
              ⚽
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.jpe,.png,.webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gn-border-subtle bg-gn-surface/60 px-4 text-sm font-medium text-gn-text hover:border-gn-accent/40 disabled:opacity-50"
          >
            {busy ? t("clubLogoUploading") : t("clubLogoChoose")}
          </button>
          {displayUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRemove()}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-medium text-gn-text-secondary hover:text-gn-text disabled:opacity-50"
            >
              {t("clubLogoRemove")}
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-xs text-gn-text-tertiary">{clubName}</p>

      {localError ? (
        <p className="mt-3 text-sm text-red-200" role="alert">
          {localError}
        </p>
      ) : null}
    </section>
  );
}
