"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";

const fabBaseClass =
  "pointer-events-auto flex size-14 shrink-0 items-center justify-center rounded-full bg-gn-accent text-black shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_14px_44px_-8px_rgba(249,115,22,0.58),0_6px_20px_-6px_rgba(0,0,0,0.45)] transition-[transform,box-shadow,background-color] duration-300 ease-gn-smooth motion-reduce:transition-colors motion-safe:hover:scale-105 motion-safe:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_18px_50px_-6px_rgba(249,115,22,0.72),0_8px_24px_-6px_rgba(0,0,0,0.5)] motion-safe:active:scale-95";

const fabEnabledClass = `${fabBaseClass} hover:bg-gn-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg`;

function fabWrapperClassName(pathname: string | null): string {
  /** DM thread: sticky composer + send — lift FAB so it does not cover controls */
  const onMessagesThread =
    typeof pathname === "string" && pathname.startsWith("/messages/");
  const bottomMobile = onMessagesThread
    ? "max-lg:bottom-[calc(13.5rem+env(safe-area-inset-bottom,0px))]"
    : "max-lg:bottom-[calc(8.75rem+env(safe-area-inset-bottom,0px))]";
  return [
    "pointer-events-none fixed z-[55]",
    "max-lg:end-[max(0.75rem,calc(4.5rem+env(safe-area-inset-right,0px)))]",
    bottomMobile,
    "lg:bottom-10 lg:end-10",
  ].join(" ");
}

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
    <div className={`${fabWrapperClassName(pathname)} rounded-full`}>
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
