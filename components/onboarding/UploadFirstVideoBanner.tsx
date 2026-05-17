"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  GN_PRIMARY_BUTTON_CLASS,
  GN_SECONDARY_BUTTON_CLASS,
} from "@/components/ui/gnButtonClasses";

type Props = {
  variant?: "profile" | "compact";
  onLater: () => void;
};

export function UploadFirstVideoBanner({ variant = "profile", onLater }: Props) {
  const t = useTranslations("profile");

  const isCompact = variant === "compact";

  return (
    <section
      role="region"
      aria-labelledby="upload-first-video-title"
      className={
        isCompact
          ? "min-w-0 max-w-full rounded-xl border border-gn-accent/35 bg-gradient-to-br from-gn-accent/12 via-gn-surface/40 to-gn-surface/20 p-3 shadow-[0_8px_32px_-16px_rgba(249,115,22,0.35)] sm:p-4"
          : "min-w-0 max-w-full rounded-2xl border border-gn-accent/35 bg-gradient-to-br from-gn-accent/12 via-gn-surface/40 to-gn-surface/20 p-4 shadow-[0_12px_40px_-16px_rgba(249,115,22,0.35)] sm:p-5"
      }
    >
      <h2
        id="upload-first-video-title"
        className={
          isCompact
            ? "text-sm font-semibold text-gn-text"
            : "text-base font-semibold text-gn-text sm:text-lg"
        }
      >
        {t("uploadFirstTitle")}
      </h2>
      <p
        className={
          isCompact
            ? "mt-1 text-xs leading-relaxed text-gn-text-secondary sm:text-sm"
            : "mt-2 text-sm leading-relaxed text-gn-text-secondary"
        }
      >
        {t("uploadFirstText")}
      </p>
      <div
        className={
          isCompact
            ? "mt-3 flex flex-col gap-2 min-[380px]:flex-row min-[380px]:items-center"
            : "mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
        }
      >
        <Link
          href="/upload"
          className={`${GN_PRIMARY_BUTTON_CLASS} min-h-10 w-full min-w-0 justify-center !py-2.5 text-sm sm:w-auto`}
        >
          {t("uploadFirstCta")}
        </Link>
        <button
          type="button"
          onClick={onLater}
          className={`${GN_SECONDARY_BUTTON_CLASS} min-h-10 w-full min-w-0 justify-center !py-2.5 text-sm sm:w-auto`}
        >
          {t("uploadFirstLater")}
        </button>
      </div>
    </section>
  );
}
