"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/lib/supabase/client";
import { triggerClientVideoDownload } from "@/lib/video/triggerClientVideoDownload";

type Props = {
  videoId: string;
  iconOnly?: boolean;
  stopPropagation?: boolean;
  className?: string;
  variant?: "rail" | "profileTile";
};

function DownloadGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 3v10m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AdminVideoDownloadButton({
  videoId,
  iconOnly = true,
  stopPropagation = false,
  className = "",
  variant = "rail",
}: Props) {
  const t = useTranslations("adminDashboard");
  const { loaded, isSuperAdmin, isModerator } = useAdminAccess();
  const [busy, setBusy] = useState(false);

  const canDownload = loaded && (isSuperAdmin || isModerator);

  const onClick = useCallback(
    async (e: React.MouseEvent) => {
      if (stopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (busy) return;

      const id = videoId.trim();
      if (!id) return;

      setBusy(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) {
          throw new Error("not_authenticated");
        }

        const res = await fetch("/api/admin/videos/download", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ videoId: id }),
        });

        const payload = (await res.json().catch(() => null)) as
          | { ok?: boolean; url?: string; filename?: string; reason?: string }
          | null;

        if (!res.ok || !payload?.ok || !payload.url) {
          throw new Error(payload?.reason ?? "download_failed");
        }

        await triggerClientVideoDownload(
          payload.url,
          payload.filename ?? `pitchrusch-${id.slice(0, 8)}.mp4`,
        );
      } catch {
        window.alert(t("videoDownloadFailed"));
      } finally {
        setBusy(false);
      }
    },
    [busy, stopPropagation, t, videoId],
  );

  if (!canDownload) return null;

  if (variant === "profileTile") {
    return (
      <button
        type="button"
        aria-label={t("downloadVideo")}
        title={t("downloadVideo")}
        disabled={busy}
        onClick={onClick}
        className="absolute left-1.5 top-1.5 z-20 inline-flex items-center gap-1 rounded-md border border-sky-400/45 bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-sky-100 transition hover:bg-sky-950/40 disabled:opacity-50"
      >
        <DownloadGlyph className="size-3 shrink-0" />
        {busy ? t("videoDownloading") : t("downloadVideoShort")}
      </button>
    );
  }

  return (
    <div className={`relative inline-flex flex-col items-stretch ${className}`}>
      <button
        type="button"
        aria-label={t("downloadVideo")}
        title={t("downloadVideo")}
        disabled={busy}
        onClick={onClick}
        className={[
          "group relative inline-flex items-center justify-center overflow-hidden rounded-full",
          iconOnly
            ? "h-7 w-7 min-h-0 shrink-0 gap-0 p-0"
            : "min-h-[2.5rem] gap-2 px-4 py-2 text-xs font-semibold tracking-wide",
          "border border-white/[0.14] bg-gradient-to-b from-white/[0.12] to-white/[0.03]",
          "text-gn-text/95 shadow-[0_2px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]",
          "backdrop-blur-md transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg",
          "hover:border-sky-400/55 hover:from-sky-500/20 hover:to-sky-500/5 hover:text-white disabled:opacity-50",
        ].join(" ")}
      >
        <DownloadGlyph
          className={`relative shrink-0 text-sky-300/95 transition-colors duration-200 group-hover:text-sky-200 ${iconOnly ? "size-3.5" : "size-4"}`}
        />
        {iconOnly ? null : (
          <span className="relative">
            {busy ? t("videoDownloading") : t("downloadVideoShort")}
          </span>
        )}
      </button>
    </div>
  );
}
