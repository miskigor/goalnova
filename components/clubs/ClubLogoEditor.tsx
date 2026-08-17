"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { CLUB_LOGO_MAX_MB, validateClubLogoFile } from "@/lib/storage/clubLogo";

type Props = {
  clubId: string;
  clubName: string;
  logoUrl: string | null;
  onLogoUrlChange: (url: string | null) => void;
  framed?: boolean;
  kind?: "logo" | "cover";
};

function mapUploadError(reason: string, t: ReturnType<typeof useTranslations<"clubs">>): string {
  if (reason === "invalid_type") return t("clubLogoInvalidType");
  if (reason === "file_too_large") return t("clubLogoTooLarge", { maxMb: CLUB_LOGO_MAX_MB });
  if (reason === "bucket_not_found") return t("clubLogoBucketMissing");
  if (reason === "forbidden") return t("dashboardForbidden");
  return t("clubLogoUploadFailed");
}

export function ClubLogoEditor({
  clubId,
  clubName,
  logoUrl,
  onLogoUrlChange,
  framed = true,
  kind = "logo",
}: Props) {
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

  async function authToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

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

    const token = await authToken();
    if (!token) {
      setLocalError(t("clubLogoUploadFailed"));
      return;
    }

    setPreviewFromFile(file);
    setBusy(true);
    const prev = logoUrl?.trim() || null;

    try {
      const form = new FormData();
      form.set("clubId", clubId);
      form.set("kind", kind);
      form.set("file", file);
      if (prev) {
        form.set("previousUrl", prev);
        form.set("previousLogoUrl", prev);
      }

      const res = await fetch("/api/clubs/upload-logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reason?: string;
        logoUrl?: string;
        coverUrl?: string;
      };

      const nextUrl = kind === "cover" ? payload.coverUrl : payload.logoUrl;
      if (!res.ok || !payload.ok || !nextUrl) {
        setLocalError(mapUploadError(payload.reason ?? "upload_failed", t));
        clearPreview();
        return;
      }

      onLogoUrlChange(nextUrl);
      setLocalError(null);
      clearPreview();
    } catch {
      setLocalError(t("clubLogoUploadFailed"));
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

    const token = await authToken();
    if (!token) {
      setLocalError(t("clubLogoUploadFailed"));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/clubs/upload-logo", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clubId,
          kind,
          logoUrl: kind === "logo" ? prev : undefined,
          coverUrl: kind === "cover" ? prev : undefined,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string };
      if (!res.ok || !payload.ok) {
        setLocalError(mapUploadError(payload.reason ?? "save_failed", t));
        return;
      }

      onLogoUrlChange(null);
      clearPreview();
    } catch {
      setLocalError(t("clubLogoUploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const displayUrl = previewUrl || logoUrl;
  const isCover = kind === "cover";
  const title = isCover ? t("clubCoverTitle") : t("clubLogoTitle");
  const hint = isCover
    ? t("clubCoverHint", { maxMb: CLUB_LOGO_MAX_MB })
    : t("clubLogoHint", { maxMb: CLUB_LOGO_MAX_MB });
  const choose = busy
    ? t("clubLogoUploading")
    : isCover
      ? t("clubCoverChoose")
      : t("clubLogoChoose");
  const remove = isCover ? t("clubCoverRemove") : t("clubLogoRemove");
  const body = (
    <>
      <h2 className="text-sm font-semibold text-gn-text">{title}</h2>
      <p className="mt-1 text-xs text-gn-text-secondary">{hint}</p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className={
            isCover
              ? "flex h-28 w-full max-w-md shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gn-border-subtle bg-gn-surface-elevated sm:h-32"
              : "flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gn-border-subtle bg-gn-surface-elevated"
          }
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl" aria-hidden>
              {isCover ? "🖼" : "⚽"}
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
            {choose}
          </button>
          {displayUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRemove()}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-medium text-gn-text-secondary hover:text-gn-text disabled:opacity-50"
            >
              {remove}
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
    </>
  );

  if (!framed) return <div>{body}</div>;
  return <section className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4">{body}</section>;
}
