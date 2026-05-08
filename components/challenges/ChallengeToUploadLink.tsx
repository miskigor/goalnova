"use client";

import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { challengeUploadHref } from "@/lib/navigation/challengeUpload";

type Props = {
  challengeId: string;
  className?: string;
  children: React.ReactNode;
  /** Optional: show resolved path next to the link (debug). */
  showNavDebug?: boolean;
};

/**
 * Upload CTA using `next/link` with a path from `getPathname` (respects
 * `localePrefix: 'as-needed'`, e.g. `/hr/upload?…` vs `/upload?…`). Avoids
 * next-intl’s `<Link>`, which was not navigating from challenges for some users.
 */
export function ChallengeToUploadLink({
  challengeId,
  className,
  children,
  showNavDebug = false,
}: Props) {
  const t = useTranslations("challenges");
  const locale = useLocale();
  const id = challengeId?.trim() ?? "";
  const path =
    id.length > 0
      ? getPathname({ href: challengeUploadHref(id), locale })
      : "";

  if (!path) {
    return (
      <p className="text-xs text-amber-500" role="alert">
        {t("missingChallengeIdForUpload")}
      </p>
    );
  }

  return (
    <div className="relative z-20 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <NextLink
        href={path}
        className={className}
      >
        {children}
      </NextLink>
      {showNavDebug ? (
        <span className="max-w-[min(100%,28rem)] break-all text-[11px] leading-snug text-gn-text-tertiary">
          {t("debugUploadTargetLabel")} {path}
        </span>
      ) : null}
    </div>
  );
}
