"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Props = {
  /** Slug or id — see `challengeLinkSegment`. */
  routeSegment: string;
  /** Visible label from challenge `title`; shown as `#…` after sanitizing a single leading `#`. */
  displayTitle: string;
  className?: string;
};

/**
 * Orange hashtag pill; links to `/challenges/[routeSegment]` (slug or id).
 */
export function ChallengeTagPill({
  routeSegment,
  displayTitle,
  className = "",
}: Props) {
  const t = useTranslations("challenges");
  const seg = routeSegment.trim();
  if (!seg) return null;

  const core = displayTitle.trim().replace(/^#+\s*/, "");
  const label =
    core.length > 0 ? `#${core}` : `#${t("emptyHashtagLabel")}`;

  return (
    <Link
      href={`/challenges/${encodeURIComponent(seg)}`}
      className={`inline-flex max-w-full items-center rounded-full bg-gn-accent/18 px-2.5 py-0.5 text-[11px] font-semibold leading-tight text-gn-accent ring-1 ring-gn-accent/40 transition-colors hover:bg-gn-accent/28 hover:ring-gn-accent/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/50 ${className}`.trim()}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="truncate">{label}</span>
    </Link>
  );
}
