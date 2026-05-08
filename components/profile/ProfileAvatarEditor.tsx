"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { updateUserAvatarUrl } from "@/lib/supabase/profile";
import { supabase } from "@/lib/supabase/client";
import { devWarn } from "@/lib/devLog";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  PROFILE_AVATAR_BUCKET,
  PROFILE_AVATAR_MAX_MB,
  buildProfileAvatarObjectPath,
  isStorageBucketNotFoundError,
  normalizedImageMime,
  storageObjectPathFromAnyProfileAvatarUrl,
  validateProfileAvatarFile,
} from "@/lib/storage/profileAvatar";
import { dispatchAvatarUrlUpdated } from "@/lib/avatar/avatarClientEvents";

type Props = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  onAvatarUrlChange: (url: string | null) => void;
};

async function removeStoredFile(publicUrl: string) {
  const resolved = storageObjectPathFromAnyProfileAvatarUrl(publicUrl);
  if (!resolved) return;
  const { error } = await supabase.storage
    .from(resolved.bucket)
    .remove([resolved.path]);
  if (error) {
    logFullSupabaseError("[ProfileAvatarEditor] storage remove", error, resolved);
  }
}

export function ProfileAvatarEditor({
  userId,
  displayName,
  avatarUrl,
  onAvatarUrlChange,
}: Props) {
  const t = useTranslations("profileEditor");
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

  async function persistAvatarUrl(url: string | null) {
    return updateUserAvatarUrl(url);
  }

  async function onPickFiles(files: FileList | null) {
    setLocalError(null);
    const file = files?.[0];
    if (!file) return;

    const bad = validateProfileAvatarFile(file);
    if (bad === "type") {
      setLocalError(t("avatarInvalidType"));
      return;
    }
    if (bad === "size") {
      setLocalError(t("avatarTooLarge", { maxMb: PROFILE_AVATAR_MAX_MB }));
      return;
    }

    setPreviewFromFile(file);

    setBusy(true);
    const path = buildProfileAvatarObjectPath(userId, file);
    const prev = avatarUrl?.trim() || null;
    const contentType = normalizedImageMime(file) || "image/jpeg";

    try {
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from(PROFILE_AVATAR_BUCKET)
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType,
        });

      if (uploadError || !uploaded?.path) {
        if (uploadError) {
          if (isStorageBucketNotFoundError(uploadError)) {
            devWarn(
              "[ProfileAvatarEditor] Storage bucket missing. Apply migration:",
              `supabase/migrations/20260427120000_profile_avatars_users_bucket.sql`,
              `(bucket id: ${PROFILE_AVATAR_BUCKET})`,
            );
          } else {
            logFullSupabaseError("[ProfileAvatarEditor] storage.upload", uploadError, {
              path,
            });
          }
        }
        setLocalError(
          uploadError && isStorageBucketNotFoundError(uploadError)
            ? t("avatarBucketMissing")
            : t("avatarUploadFailed"),
        );
        clearPreview();
        return;
      }

      const { data: pub } = supabase.storage
        .from(PROFILE_AVATAR_BUCKET)
        .getPublicUrl(uploaded.path);
      const publicUrl = pub.publicUrl;

      const res = await persistAvatarUrl(publicUrl);
      if (!res.success) {
        setLocalError(t("avatarUploadFailed"));
        await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([uploaded.path]);
        clearPreview();
        return;
      }

      if (prev) await removeStoredFile(prev);
      onAvatarUrlChange(publicUrl);
      dispatchAvatarUrlUpdated(publicUrl);
      setLocalError(null);
      clearPreview();
    } catch (e) {
      logFullSupabaseError("[ProfileAvatarEditor] upload", e);
      setLocalError(t("avatarUploadFailed"));
      try {
        await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([path]);
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
    const prev = avatarUrl?.trim() || null;
    if (!prev && !previewUrl) return;

    if (!prev && previewUrl) {
      clearPreview();
      return;
    }

    setBusy(true);
    try {
      const res = await persistAvatarUrl(null);
      if (!res.success) {
        setLocalError(t("avatarUploadFailed"));
        return;
      }
      await removeStoredFile(prev!);
      onAvatarUrlChange(null);
      dispatchAvatarUrlUpdated(null);
      clearPreview();
    } catch (e) {
      logFullSupabaseError("[ProfileAvatarEditor] remove", e);
      setLocalError(t("avatarUploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 max-w-full rounded-xl border border-white/[0.08] bg-black/20 p-4">
      <label className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
        {t("avatarLabel")}
      </label>
      <p className="mt-1 text-xs text-gn-text-tertiary">
        {t("avatarHint", { maxMb: PROFILE_AVATAR_MAX_MB })}
      </p>

      <div className="mt-4 flex min-w-0 max-w-full flex-wrap items-center gap-4">
        <ProfileAvatar
          name={displayName}
          imageUrl={previewUrl || avatarUrl}
          sizeClassName="h-20 w-20 shrink-0 text-lg"
        />
        <div className="flex min-w-0 max-w-full flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            suppressHydrationWarning
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
            onClick={() => {
              inputRef.current?.click();
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gn-border-subtle bg-gn-surface/60 px-4 text-sm font-medium text-gn-text transition-colors hover:border-gn-accent/40 hover:bg-gn-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t("avatarUploading") : t("avatarChoose")}
          </button>
          {avatarUrl || previewUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRemove()}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 text-sm font-medium text-gn-text-secondary transition-colors hover:border-gn-accent/30 hover:text-gn-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("avatarRemove")}
            </button>
          ) : null}
        </div>
      </div>

      {localError ? (
        <p className="mt-3 text-sm text-gn-accent" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
