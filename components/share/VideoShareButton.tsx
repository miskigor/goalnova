"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { VideoShareModal } from "@/components/share/VideoShareModal";
import {
  createPitchRuschVideoShare,
  localizedPublicVideoPath,
} from "@/lib/share/universalVideoShare";
import { devLog } from "@/lib/devLog";

const FEEDBACK_MS = 2800;
const SHARE_OPEN_DEBOUNCE_MS = 350;

type Props = {
  videoId: string;
  playerDisplayName: string;
  caption?: string | null;
  className?: string;
  stopPropagation?: boolean;
  /** When set, overrides `share` namespace for the visible button (e.g. Explore uses `explore.shareVideo`). */
  buttonLabel?: string;
  buttonAriaLabel?: string;
  /** Icon only (e.g. compact video toolbar); label stays in `aria-label`. */
  iconOnly?: boolean;
};

function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 6 12 2 8 6M12 2v13"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VideoShareButton({
  videoId,
  playerDisplayName,
  caption: videoCaption,
  className = "",
  stopPropagation = false,
  buttonLabel,
  buttonAriaLabel,
  iconOnly = false,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("share");

  const lastOpenAtRef = useRef(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  /** Floating line — errors only (success feedback disabled). */
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [shareStats, setShareStats] = useState({
    linkCopied: 0,
    outboundOpens: 0,
  });

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const path = localizedPublicVideoPath(locale, videoId);
    return `${window.location.origin}${path}`;
  }, [locale, videoId]);

  const shareLabels = useMemo(
    () => ({
      invalidUrl: t("invalidPublicUrl"),
      copyFailed: t("copyFailed"),
    }),
    [t],
  );

  const shareCtl = useMemo(
    () =>
      createPitchRuschVideoShare({
        videoId,
        playerName: playerDisplayName,
        caption: videoCaption ?? null,
        publicUrl: shareUrl,
        labels: shareLabels,
      }),
    [videoId, playerDisplayName, videoCaption, shareUrl, shareLabels],
  );

  const destinationLinks = useMemo(
    () => shareCtl.getSocialDestinations(),
    [shareCtl],
  );

  useEffect(() => {
    if (!errorFeedback) return;
    const id = window.setTimeout(() => setErrorFeedback(null), FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [errorFeedback]);

  const openModal = useCallback(() => {
    setCopied(false);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setCopied(false);
  }, []);

  const handleCopy = useCallback(async () => {
    const r = await shareCtl.copyLink();
    if (r.ok) {
      setCopied(true);
      setShareStats((s) => ({ ...s, linkCopied: s.linkCopied + 1 }));
      return;
    }
    setErrorFeedback(t("shareFailed"));
  }, [shareCtl, t]);

  const handleOutboundShare = useCallback(() => {
    setShareStats((s) => ({ ...s, outboundOpens: s.outboundOpens + 1 }));
  }, []);

  const handleOpeningShare = useCallback(() => {
    /* Silent — no “opening share” toast. */
  }, []);

  const handleShareClick = useCallback(
    (e: React.MouseEvent) => {
      devLog("[PitchRusch] share clicked", videoId);
      if (stopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }

      const now = Date.now();
      if (
        lastOpenAtRef.current !== 0 &&
        now - lastOpenAtRef.current < SHARE_OPEN_DEBOUNCE_MS
      ) {
        return;
      }
      lastOpenAtRef.current = now;

      openModal();
    },
    [openModal, stopPropagation, videoId],
  );

  const showGlow = Boolean(errorFeedback);
  const { payload } = shareCtl;

  return (
    <>
      <div className={`relative inline-flex flex-col items-stretch ${className}`}>
        <button
          type="button"
          aria-label={buttonAriaLabel ?? t("shareAria")}
          onClick={handleShareClick}
          data-pitchrusch-share-taps={
            shareStats.linkCopied + shareStats.outboundOpens
          }
          className={[
            "group relative inline-flex items-center justify-center overflow-hidden rounded-full",
            iconOnly
              ? "h-7 w-7 min-h-0 shrink-0 gap-0 p-0"
              : "min-h-[2.5rem] gap-2 px-4 py-2 text-xs font-semibold tracking-wide",
            "border border-white/[0.14] bg-gradient-to-b from-white/[0.12] to-white/[0.03]",
            "text-gn-text/95 shadow-[0_2px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]",
            "backdrop-blur-md transition-all duration-200 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg",
            "hover:border-gn-accent/55 hover:from-gn-accent/20 hover:to-gn-accent/5 hover:text-white hover:shadow-[0_0_28px_rgba(249,115,22,0.22),0_4px_20px_rgba(0,0,0,0.4)] active:scale-[0.96]",
            showGlow
              ? "border-red-400/50 text-white ring-2 ring-red-500/40 ring-offset-2 ring-offset-transparent"
              : "",
          ].join(" ")}
        >
          <span
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            aria-hidden
            style={{
              background:
                "radial-gradient(120% 80% at 50% 0%, rgba(249,115,22,0.18), transparent 55%)",
            }}
          />
          <ShareGlyph
            className={`relative shrink-0 text-gn-accent/90 transition-colors duration-200 group-hover:text-gn-accent ${iconOnly ? "size-3.5" : "size-4"}`}
          />
          {iconOnly ? null : (
            <span className="relative">{buttonLabel ?? t("share")}</span>
          )}
        </button>
      </div>

      {errorFeedback ? (
        <div
          className="pointer-events-none fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] z-[200] mx-auto max-w-[20rem]"
          role="alert"
          aria-live="assertive"
        >
          <div
            className="rounded-2xl border border-red-500/40 bg-red-950/92 px-4 py-3 text-center text-xs font-medium text-red-50 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            style={{
              animation: "gn-share-toast 0.35s ease-out",
            }}
          >
            {errorFeedback}
          </div>
        </div>
      ) : null}

      <VideoShareModal
        open={modalOpen}
        onClose={closeModal}
        shareUrl={
          shareUrl ||
          (typeof window !== "undefined"
            ? `${window.location.origin}${localizedPublicVideoPath(locale, videoId)}`
            : "")
        }
        shareTitle={payload.title}
        shareText={payload.text}
        copied={copied}
        onCopy={handleCopy}
        onOutboundShare={handleOutboundShare}
        onOpeningShare={handleOpeningShare}
        destinationLinks={destinationLinks}
        onPlatformCopySuccess={(platform) => {
          setShareStats((s) => ({ ...s, linkCopied: s.linkCopied + 1 }));
          void platform;
        }}
        onShareFailed={() => setErrorFeedback(t("shareFailed"))}
      />
    </>
  );
}
