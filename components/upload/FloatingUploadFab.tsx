"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";

const fabBaseClass =
  "pointer-events-auto flex size-14 shrink-0 items-center justify-center rounded-full bg-gn-accent text-black shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_14px_44px_-8px_rgba(249,115,22,0.58),0_6px_20px_-6px_rgba(0,0,0,0.45)] transition-[transform,box-shadow,background-color] duration-300 ease-gn-smooth motion-reduce:transition-colors motion-safe:hover:scale-105 motion-safe:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_18px_50px_-6px_rgba(249,115,22,0.72),0_8px_24px_-6px_rgba(0,0,0,0.5)] motion-safe:active:scale-95";

const fabEnabledClass = `${fabBaseClass} hover:bg-gn-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg`;

const fabPositionClass =
  "pointer-events-none fixed z-[55] end-[max(1rem,calc(env(safe-area-inset-right,0px)+1rem))] bottom-[max(1rem,calc(5.75rem+env(safe-area-inset-bottom,0px)))] lg:bottom-10 lg:end-10";

/**
 * Fixed upload FAB for authenticated app chrome. Hidden on `/upload` and while eligibility is loading, signed out, or unknown.
 */
export function FloatingUploadFab() {
  const pathname = usePathname();
  const t = useTranslations("upload");
  const eligibility = useVideoUploadEligibility();

  if (pathname === "/upload" || pathname.startsWith("/upload/")) {
    return null;
  }

  if (eligibility === "loading" || eligibility === "signed_out") {
    return null;
  }

  if (eligibility === "unknown" || eligibility === "non_player") {
    return null;
  }

  return (
    <div
      data-gn-debug="floating-upload-fab-fixed-z55-blue-outline"
      className={`${fabPositionClass} rounded-full ring-4 ring-blue-500/70 ring-offset-2 ring-offset-transparent`}
    >
      <Link
        href="/upload"
        className={fabEnabledClass}
        aria-label={t("floatingUploadAria")}
      >
        <NavIcon name="upload" className="size-6 text-black" />
      </Link>
    </div>
  );
}
