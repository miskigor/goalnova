"use client";

import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { getPathname, Link } from "@/i18n/navigation";
import { ChallengeToUploadLink } from "@/components/challenges/ChallengeToUploadLink";
import {
  GN_PRIMARY_BUTTON_CLASS,
  GN_SECONDARY_BUTTON_CLASS,
} from "@/components/ui/gnButtonClasses";
import { challengeUploadHref } from "@/lib/navigation/challengeUpload";
import { shouldOfferStaffTestUpload } from "@/lib/supabase/challengeCardAudience";
import { useChallengeCardAudience } from "@/hooks/useChallengeCardAudience";

type Density = "compact" | "comfortable";

type Props = {
  challengeId: string;
  challengeStatus?: string | null;
  /** Locale-aware path, e.g. `/challenges/my-slug` */
  detailHref: string;
  density?: Density;
};

function actionHeights(density: Density) {
  return density === "comfortable"
    ? "h-11 min-h-[2.75rem] px-6"
    : "h-10 min-h-10 px-4";
}

/**
 * Role-specific challenge actions (hub + detail): player upload, staff manage, scout view-only.
 */
export function ChallengeCardActions({
  challengeId,
  challengeStatus = "active",
  detailHref,
  density = "compact",
}: Props) {
  const t = useTranslations("challenges");
  const locale = useLocale();
  const audience = useChallengeCardAudience();
  const canUploadToChallenge = challengeStatus === "active";

  const h = actionHeights(density);
  const primary = `${GN_PRIMARY_BUTTON_CLASS} inline-flex items-center justify-center text-center text-sm whitespace-normal sm:whitespace-nowrap ${h}`;
  const secondary = `${GN_SECONDARY_BUTTON_CLASS} inline-flex items-center justify-center text-center text-sm whitespace-normal sm:whitespace-nowrap ${h}`;
  const editClass = `inline-flex items-center justify-center rounded-xl border border-orange-500/45 bg-orange-500/10 text-center text-sm font-semibold text-orange-200 transition-colors hover:bg-orange-500/15 whitespace-normal sm:whitespace-nowrap ${h}`;

  if ("status" in audience && audience.status === "loading") {
    return (
      <div
        role="status"
        className={`inline-flex items-center rounded-full border border-gn-border-subtle bg-gn-surface/40 text-sm text-gn-text-tertiary ${h} px-6`}
      >
        {t("challengeCardLoading")}
      </div>
    );
  }

  if ("status" in audience && audience.status === "unknown") {
    return (
      <Link href={detailHref} className={secondary}>
        {t("view")}
      </Link>
    );
  }

  if (audience.kind === "scout") {
    return (
      <Link href={detailHref} className={primary}>
        {t("view")}
      </Link>
    );
  }

  if (audience.kind === "staff") {
    const adminEditHref = `/admin/challenges?challengeId=${encodeURIComponent(challengeId)}`;
    const showTest = canUploadToChallenge && shouldOfferStaffTestUpload(audience);
    const testPath = getPathname({
      href: challengeUploadHref(challengeId),
      locale,
    });

    return (
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <Link href={detailHref} className={secondary}>
          {t("view")}
        </Link>
        <Link href={adminEditHref} className={editClass}>
          {t("edit")}
        </Link>
        {showTest && testPath ? (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              {t("challengeUploadSuperAdminBypassLabel")}
            </span>
            <NextLink
              href={testPath}
              className={`inline-flex items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-2 text-center text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/10 whitespace-normal sm:whitespace-nowrap ${density === "comfortable" ? "min-h-10" : "min-h-9"}`}
            >
              {t("testUploadChallenge")}
            </NextLink>
          </div>
        ) : null}
      </div>
    );
  }

  // guest | submitter
  if (!canUploadToChallenge) {
    return (
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <Link href={detailHref} className={primary}>
          {t("view")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <ChallengeToUploadLink challengeId={challengeId} className={primary}>
        {t("uploadChallengeVideo")}
      </ChallengeToUploadLink>
      <Link href={detailHref} className={secondary}>
        {t("view")}
      </Link>
    </div>
  );
}
