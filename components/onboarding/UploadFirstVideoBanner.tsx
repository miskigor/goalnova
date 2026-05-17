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

const buttonClass =
  "box-border !flex w-full max-w-full min-w-0 justify-center !py-2.5 text-sm";

export function UploadFirstVideoBanner({ variant = "profile", onLater }: Props) {
  const t = useTranslations("profile");

  const isCompact = variant === "compact";

  return (
    <section
      role="region"
      aria-labelledby="upload-first-video-title"
      className={[
        "box-border w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-gn-accent/35",
        "bg-gradient-to-br from-gn-accent/12 via-gn-surface/40 to-gn-surface/20",
        isCompact ? "p-4 shadow-[0_8px_32px_-16px_rgba(249,115,22,0.35)]" : "p-4 shadow-[0_12px_40px_-16px_rgba(249,115,22,0.35)] sm:p-5",
      ].join(" ")}
    >
      <h2
        id="upload-first-video-title"
        className={[
          "break-words font-semibold leading-snug text-gn-text",
          isCompact ? "text-sm" : "text-base sm:text-lg",
        ].join(" ")}
      >
        {t("uploadFirstTitle")}
      </h2>
      <p
        className={[
          "mt-2 break-words leading-normal text-gn-text-secondary",
          isCompact ? "text-xs sm:text-sm" : "text-sm",
        ].join(" ")}
      >
        {t("uploadFirstText")}
      </p>
      <div className="mt-4 grid w-full max-w-full min-w-0 grid-cols-1 gap-3 min-[430px]:grid-cols-2">
        <Link href="/upload" className={`${GN_PRIMARY_BUTTON_CLASS} ${buttonClass}`}>
          {t("uploadFirstCta")}
        </Link>
        <button
          type="button"
          onClick={onLater}
          className={`${GN_SECONDARY_BUTTON_CLASS} ${buttonClass}`}
        >
          {t("uploadFirstLater")}
        </button>
      </div>
    </section>
  );
}
