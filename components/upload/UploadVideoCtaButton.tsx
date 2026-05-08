"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";

export const UPLOAD_VIDEO_CTA_BUTTON_CLASS = `${GN_PRIMARY_BUTTON_CLASS} w-full sm:w-auto sm:min-w-[12rem] py-3.5`;

type Props = {
  className?: string;
};

/** Primary “Upload Video” CTA linking to `/upload` (players only). */
export function UploadVideoCtaButton({ className = "" }: Props) {
  const tFeed = useTranslations("homeFeed");
  const eligibility = useVideoUploadEligibility();

  if (eligibility !== "player") {
    return null;
  }

  return (
    <Link
      href="/upload"
      className={`${UPLOAD_VIDEO_CTA_BUTTON_CLASS} ${className}`.trim()}
      aria-label={tFeed("uploadVideoCtaAria")}
    >
      <NavIcon name="upload" className="size-5 shrink-0 text-black" />
      {tFeed("uploadVideoCta")}
    </Link>
  );
}
