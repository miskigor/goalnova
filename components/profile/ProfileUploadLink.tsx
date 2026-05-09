"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";

/**
 * Players only — inline next to “Edit profile” on `/profile` (not a fixed FAB).
 */
export function ProfileUploadLink() {
  const t = useTranslations("upload");
  const eligibility = useVideoUploadEligibility();

  if (eligibility !== "player") {
    return null;
  }

  return (
    <Link
      href="/upload"
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gn-accent bg-gn-accent px-4 py-2 text-sm font-semibold text-black shadow-sm transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-gn-accent-hover motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg"
      aria-label={t("floatingUploadAria")}
    >
      <NavIcon name="upload" className="size-4 shrink-0 text-black" aria-hidden />
      {t("upload")}
    </Link>
  );
}
