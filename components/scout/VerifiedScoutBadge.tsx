"use client";

import { useTranslations } from "next-intl";

type Props = {
  className?: string;
  /** When false, omit title/aria (parent provides context). Default true. */
  withTooltip?: boolean;
};

/**
 * Trust mark for scouts with `role === 'scout'` and `scout_verification_status === 'approved'`.
 * Do not render based on role alone.
 */
export function VerifiedScoutBadge({
  className = "",
  withTooltip = true,
}: Props) {
  const t = useTranslations("scoutVerification");
  const label = t("verifiedScoutBadge");
  const tip = withTooltip ? t("verifiedScoutBadgeAria") : undefined;
  const aria =
    withTooltip && tip ? `${label}. ${tip}` : label;

  return (
    <span
      role="status"
      aria-label={aria}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md border border-teal-400/25 bg-gradient-to-b from-teal-950/50 to-slate-950/40 px-2 py-0.5 text-xs font-semibold leading-none text-teal-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-teal-400/15 ${className}`}
      title={tip}
    >
      <svg
        className="size-3.5 shrink-0 text-teal-300/90"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span className="truncate">{label}</span>
    </span>
  );
}
