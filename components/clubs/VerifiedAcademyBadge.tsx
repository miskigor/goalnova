import { useTranslations } from "next-intl";

type Props = {
  compact?: boolean;
  className?: string;
};

/** Verified Academy badge for partner club players and club pages. */
export function VerifiedAcademyBadge({ compact = false, className = "" }: Props) {
  const t = useTranslations("clubs");

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border border-orange-500/55 bg-gradient-to-r from-orange-500/20 to-amber-500/10 px-2 py-0.5 font-semibold tracking-wide text-orange-100 shadow-[0_0_20px_rgba(249,115,22,0.15)] ${compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]"} ${className}`}
    >
      <span aria-hidden className="shrink-0 leading-none">
        🏟
      </span>
      <span className="truncate uppercase">{t("verifiedAcademyBadge")}</span>
    </span>
  );
}
