"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";

/**
 * Players only — inline next to “Edit profile” on `/profile` (not a fixed FAB).
 */
type Props = { className?: string };

export function ProfileUploadLink({ className = "" }: Props) {
  const t = useTranslations("upload");
  const eligibility = useVideoUploadEligibility();

  if (eligibility !== "player") {
    return null;
  }

  return (
    <Link
      href="/upload"
      className={[
        "box-border flex w-full max-w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-gn-accent bg-gn-accent px-3 py-2.5 text-sm font-semibold text-black shadow-sm transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-gn-accent-hover motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg max-lg:gap-1 max-lg:rounded-lg max-lg:py-1 max-lg:text-xs",
        className,
      ].join(" ")}
      aria-label={t("floatingUploadAria")}
    >
      <NavIcon name="upload" className="size-4 shrink-0 text-black max-lg:size-3" aria-hidden />
      <span className="min-w-0 truncate">{t("upload")}</span>
    </Link>
  );
}
