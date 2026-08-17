import { useTranslations } from "next-intl";
import {
  parseClubOrganizationKind,
  type ClubOrganizationKind,
} from "@/lib/clubs/organizationKind";

type Props = {
  kind?: ClubOrganizationKind | string | null;
  compact?: boolean;
  className?: string;
};

/** Verified partner badge: club or academy, based on the organization's chosen type. */
export function VerifiedAcademyBadge({ kind = "club", compact = false, className = "" }: Props) {
  const t = useTranslations("clubs");
  const resolved = parseClubOrganizationKind(kind);
  const label =
    resolved === "academy" ? t("verifiedAcademyBadge") : t("verifiedClubBadge");

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border border-orange-500/55 bg-gradient-to-r from-orange-500/20 to-amber-500/10 px-2 py-0.5 font-semibold tracking-wide text-orange-100 shadow-[0_0_20px_rgba(249,115,22,0.15)] ${compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]"} ${className}`}
    >
      <span aria-hidden className="shrink-0 leading-none">
        🏟
      </span>
      <span className="truncate uppercase">{label}</span>
    </span>
  );
}
