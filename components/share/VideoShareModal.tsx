"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { devError } from "@/lib/devLog";
import { ShareDestinationIcon } from "@/components/share/ShareDestinationIcon";
import { copyTextToClipboard } from "@/lib/share/copyToClipboard";
import {
  buildVideoShareDestinationLinks,
  type VideoShareDestinationId,
  type VideoShareDestinationLink,
} from "@/lib/share/socialShareUrls";

const LEAVE_MS = 280;

type Props = {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  shareTitle: string;
  shareText: string;
  copied: boolean;
  onCopy: () => void | Promise<void>;
  onOutboundShare?: () => void;
  onOpeningShare?: () => void;
  destinationLinks?: VideoShareDestinationLink[] | null;
  onPlatformCopySuccess?: (platform: "instagram" | "tiktok") => void;
  onShareFailed?: () => void;
};

function CopyLinkGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function OpenPageGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <span
      className={`flex size-[4.125rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-inset ring-white/20 ${className ?? ""}`}
      aria-hidden
    >
      <svg
        className="size-8 text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <span
      className={`flex size-[4.125rem] shrink-0 items-center justify-center rounded-2xl bg-[#0c0c0c] shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-inset ring-white/15 ${className ?? ""}`}
      aria-hidden
    >
      <svg className="size-[1.85rem]" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#fff"
          d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.63-5.71-.02-.5-.01-1-.01-1.49 0-3.35.01-6.69.02-10.04 1.49.01 2.99.02 4.48-.01.13 1.28.64 2.52 1.53 3.44.86.86 2.01 1.37 3.19 1.47V.02h.6z"
        />
      </svg>
    </span>
  );
}

function openShareHref(href: string, onBlocked?: () => void): void {
  if (href.startsWith("mailto:")) {
    window.location.href = href;
    return;
  }
  const isHttp = /^https?:\/\//i.test(href);
  const w = window.open(href, "_blank", "noopener,noreferrer");
  if (isHttp && w == null) {
    onBlocked?.();
  }
}

export function VideoShareModal({
  open,
  onClose,
  shareUrl,
  shareTitle,
  shareText,
  copied,
  onCopy,
  onOutboundShare,
  onOpeningShare,
  destinationLinks: destinationLinksProp,
  onPlatformCopySuccess,
  onShareFailed,
}: Props) {
  const t = useTranslations("share");
  const titleId = useId();
  const wasEverOpen = useRef(false);
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const [ttCopied, setTtCopied] = useState(false);

  const mounted = open || exiting;

  useLayoutEffect(() => {
    if (open) {
      wasEverOpen.current = true;
      setExiting(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(id);
    }
    if (!wasEverOpen.current) return;
    setEntered(false);
    setExiting(true);
  }, [open]);

  useEffect(() => {
    if (open || !exiting) return;
    const tLeave = window.setTimeout(() => {
      setExiting(false);
      wasEverOpen.current = false;
    }, LEAVE_MS);
    return () => window.clearTimeout(tLeave);
  }, [open, exiting]);

  const destinationLabels = useMemo(
    (): Record<VideoShareDestinationId, string> => ({
      whatsapp: t("destinations.whatsapp"),
      twitter: t("destinations.twitter"),
      facebook: t("destinations.facebook"),
      messenger: t("destinations.messenger"),
      telegram: t("destinations.telegram"),
      linkedin: t("destinations.linkedin"),
      reddit: t("destinations.reddit"),
      email: t("destinations.email"),
    }),
    [t],
  );

  const destinationLinks = useMemo(() => {
    if (destinationLinksProp && destinationLinksProp.length > 0) {
      return destinationLinksProp;
    }
    if (!shareUrl.trim()) return [];
    try {
      return buildVideoShareDestinationLinks({
        pageUrl: shareUrl,
        shareText,
        shareTitle,
      });
    } catch (e) {
      devError("[PitchRusch share] buildVideoShareDestinationLinks failed", e);
      return [];
    }
  }, [destinationLinksProp, shareUrl, shareText, shareTitle]);

  useEffect(() => {
    if (!open) {
      setIgCopied(false);
      setTtCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, open, onClose]);

  const onBackdropDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const activateDestination = useCallback(
    (href: string) => {
      onOpeningShare?.();
      onOutboundShare?.();
      openShareHref(href, onShareFailed);
    },
    [onOpeningShare, onOutboundShare, onShareFailed],
  );

  const openVideoPage = useCallback(() => {
    const u = shareUrl.trim();
    if (!u) return;
    onOpeningShare?.();
    onOutboundShare?.();
    openShareHref(u, onShareFailed);
  }, [shareUrl, onOpeningShare, onOutboundShare, onShareFailed]);

  const copyForPlatform = useCallback(
    async (platform: "instagram" | "tiktok") => {
      const url = shareUrl.trim();
      if (!url) return;
      try {
        const ok = await copyTextToClipboard(url);
        if (ok) {
          if (platform === "instagram") {
            setIgCopied(true);
            window.setTimeout(() => setIgCopied(false), 2600);
          } else {
            setTtCopied(true);
            window.setTimeout(() => setTtCopied(false), 2600);
          }
          onOutboundShare?.();
          onPlatformCopySuccess?.(platform);
        } else {
          devError("[PitchRusch share] platform copy returned false", { platform });
          onShareFailed?.();
        }
      } catch (e) {
        devError("[PitchRusch share] platform copy failed", e);
        onShareFailed?.();
      }
    },
    [shareUrl, onOutboundShare, onPlatformCopySuccess, onShareFailed],
  );

  if (!mounted) return null;

  if (typeof document === "undefined") return null;

  const backdropCls = [
    "fixed inset-0 z-[100] flex min-w-0 items-end justify-center overflow-x-hidden bg-black/82 p-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:items-center sm:bg-black/78 sm:p-4",
    "transition-[opacity,backdrop-filter] duration-200 ease-out motion-reduce:transition-none",
    entered ? "opacity-100" : "opacity-0",
  ].join(" ");

  const sheetCls = [
    "box-border flex w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-t-[1.25rem] border border-gn-accent/20 border-b-0 bg-[#060606] shadow-[0_-12px_56px_rgba(0,0,0,0.72),0_0_0_1px_rgba(249,115,22,0.1),0_0_72px_rgba(249,115,22,0.06)]",
    "sm:max-h-[min(88dvh,42rem)] sm:rounded-2xl sm:border-b sm:shadow-[0_32px_100px_rgba(0,0,0,0.88),0_0_0_1px_rgba(249,115,22,0.12),0_0_88px_rgba(249,115,22,0.07)]",
    "max-h-[min(92dvh,44rem)] transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-opacity motion-reduce:duration-150",
    entered
      ? "translate-y-0 opacity-100 sm:scale-100"
      : "translate-y-full opacity-0 sm:translate-y-6 sm:scale-[0.94]",
    "motion-reduce:translate-y-0 motion-reduce:sm:translate-y-0 motion-reduce:sm:scale-100",
  ].join(" ");

  const modal = (
    <div
      className={backdropCls}
      role="presentation"
      onMouseDown={onBackdropDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={sheetCls}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 flex-col items-center pt-3 sm:pt-0">
          <div
            className="mb-2 h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden"
            aria-hidden
          />
          <div className="w-full border-b border-gn-accent/20 bg-gradient-to-r from-gn-accent/[0.12] via-transparent to-transparent px-5 pb-5 pt-1 sm:rounded-t-2xl sm:pt-5">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <h2
                id={titleId}
                className="min-w-0 break-words text-[1.35rem] font-semibold leading-tight tracking-tight text-gn-text"
              >
                {t("modalTitle")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3 py-1.5 text-sm font-medium text-gn-text-secondary transition-all duration-200 hover:bg-white/[0.06] hover:text-gn-accent hover:shadow-[0_0_20px_rgba(249,115,22,0.12)]"
              >
                {t("close")}
              </button>
            </div>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-gn-text-secondary">
              {t("modalSubtitle")}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-7">
            <section
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 ring-1 ring-inset ring-white/[0.04] sm:p-5"
              aria-label={t("quickActionsLabel")}
            >
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-gn-text-tertiary">
                {t("quickActionsLabel")}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void onCopy();
                  }}
                  className="group relative flex w-full min-h-[3.5rem] items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-b from-[#fb923c] via-gn-accent to-[#ea580c] px-5 py-4 text-base font-semibold tracking-wide text-white shadow-[0_8px_32px_rgba(249,115,22,0.45),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all duration-200 hover:border-orange-100/25 hover:shadow-[0_12px_48px_rgba(249,115,22,0.55),0_0_48px_rgba(249,115,22,0.2),inset_0_1px_0_rgba(255,255,255,0.28)] hover:brightness-[1.03] active:scale-[0.99] active:brightness-[0.97]"
                  aria-live="polite"
                >
                  <CopyLinkGlyph className="size-5 shrink-0 opacity-95" />
                  {copied ? t("linkCopied") : t("copyLink")}
                </button>
                <button
                  type="button"
                  onClick={openVideoPage}
                  disabled={!shareUrl.trim()}
                  className="flex w-full min-h-[2.875rem] items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-gn-text-secondary transition-all duration-200 hover:border-orange-500/30 hover:bg-orange-500/[0.06] hover:text-gn-text hover:shadow-[0_0_24px_rgba(249,115,22,0.14)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
                >
                  <OpenPageGlyph className="size-[1.05rem] shrink-0 opacity-80" />
                  {t("openVideoPage")}
                </button>
              </div>
            </section>

            <div className="relative flex items-center gap-3">
              <div
                className="h-px flex-1 bg-gradient-to-r from-transparent via-white/18 to-transparent"
                aria-hidden
              />
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-gn-accent/95">
                {t("socialGridLabel")}
              </span>
              <div
                className="h-px flex-1 bg-gradient-to-r from-transparent via-white/18 to-transparent"
                aria-hidden
              />
            </div>

            <section aria-label={t("socialGridLabel")} className="min-w-0">
              <ul className="grid w-full list-none grid-cols-3 gap-4 p-0 sm:grid-cols-4 sm:gap-5">
                {destinationLinks.map(({ id, href }) => (
                  <li key={id} className="min-w-0 w-full max-w-full">
                    <button
                      type="button"
                      onClick={() => activateDestination(href)}
                      className="group flex w-full min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-1.5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_22px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/[0.05] transition-[border-color,box-shadow,background-color,filter] duration-200 ease-out hover:border-gn-accent/40 hover:from-orange-500/[0.09] hover:to-white/[0.035] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_40px_rgba(249,115,22,0.14),0_0_0_1px_rgba(249,115,22,0.08)] active:brightness-[0.94] motion-reduce:transition-none motion-reduce:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_22px_rgba(0,0,0,0.35)] sm:px-2"
                    >
                      <span
                        className="origin-center transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] group-active:scale-[0.92] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-active:scale-100"
                        aria-hidden
                      >
                        <ShareDestinationIcon id={id} size="large" />
                      </span>
                      <span className="line-clamp-2 w-full min-w-0 px-0.5 text-center text-[11px] font-semibold leading-tight text-gn-text-secondary transition-colors duration-200 ease-out group-hover:text-gn-text">
                        {destinationLabels[id]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-center text-[10px] leading-relaxed text-gn-text-tertiary">
                {t("shareOpensNewTabHint")}
              </p>
            </section>

            <section
              className="rounded-2xl border border-gn-accent/18 bg-black/50 p-5 ring-1 ring-inset ring-white/[0.03] sm:p-6"
              aria-label={t("fallbackSectionLabel")}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gn-accent">
                {t("fallbackSectionLabel")}
              </p>
              <div className="mt-5 flex flex-col gap-5 border-t border-white/[0.07] pt-5">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 ring-1 ring-inset ring-white/[0.04] transition-all duration-200 hover:border-orange-500/20 hover:shadow-[0_0_32px_rgba(249,115,22,0.08)] sm:p-5">
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <InstagramGlyph />
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <p className="text-base font-semibold text-gn-text">
                        {t("platformInstagram")}
                      </p>
                      <p className="mt-2.5 text-sm leading-relaxed text-gn-text-secondary">
                        {t("instagramHelper")}
                      </p>
                      <button
                        type="button"
                        onClick={() => void copyForPlatform("instagram")}
                        disabled={!shareUrl.trim()}
                        aria-label={
                          igCopied
                            ? t("copiedForInstagram")
                            : t("copyLinkForInstagram")
                        }
                        className="mt-4 w-full min-h-[2.75rem] rounded-xl border border-gn-accent/40 bg-gn-accent/10 px-4 py-2.5 text-sm font-semibold text-gn-accent transition-all duration-200 hover:border-gn-accent/55 hover:bg-gn-accent/18 hover:text-white hover:shadow-[0_0_28px_rgba(249,115,22,0.2)] disabled:pointer-events-none disabled:opacity-40 sm:max-w-xs"
                      >
                        {igCopied
                          ? t("copiedForInstagram")
                          : t("copyLinkForInstagram")}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 ring-1 ring-inset ring-white/[0.04] transition-all duration-200 hover:border-orange-500/20 hover:shadow-[0_0_32px_rgba(249,115,22,0.08)] sm:p-5">
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <TikTokGlyph />
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <p className="text-base font-semibold text-gn-text">
                        {t("platformTikTok")}
                      </p>
                      <p className="mt-2.5 text-sm leading-relaxed text-gn-text-secondary">
                        {t("tiktokHelper")}
                      </p>
                      <button
                        type="button"
                        onClick={() => void copyForPlatform("tiktok")}
                        disabled={!shareUrl.trim()}
                        aria-label={
                          ttCopied
                            ? t("copiedForTikTok")
                            : t("copyLinkForTikTok")
                        }
                        className="mt-4 w-full min-h-[2.75rem] rounded-xl border border-gn-accent/40 bg-gn-accent/10 px-4 py-2.5 text-sm font-semibold text-gn-accent transition-all duration-200 hover:border-gn-accent/55 hover:bg-gn-accent/18 hover:text-white hover:shadow-[0_0_28px_rgba(249,115,22,0.2)] disabled:pointer-events-none disabled:opacity-40 sm:max-w-xs"
                      >
                        {ttCopied
                          ? t("copiedForTikTok")
                          : t("copyLinkForTikTok")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
