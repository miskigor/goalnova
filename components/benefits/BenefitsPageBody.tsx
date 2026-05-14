import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type TagKind = "included" | "locked" | "unlocked" | "premium" | "scout" | "club";

function tagKey(kind: TagKind): string {
  switch (kind) {
    case "premium":
      return "availableWithPremium";
    case "scout":
      return "availableWithScoutPro";
    case "club":
      return "availableWithClubPlan";
    default:
      return kind;
  }
}

const PLAYER_ROWS: { feature: string; tag: TagKind }[] = [
  { feature: "leaderboards", tag: "included" },
  { feature: "profileStatistics", tag: "included" },
  { feature: "premiumBoost", tag: "premium" },
  { feature: "featuredVideo", tag: "premium" },
  { feature: "featuredPlayerBadge", tag: "premium" },
  { feature: "priorityScoutVisibility", tag: "premium" },
  { feature: "aiImprovementTips", tag: "premium" },
  { feature: "moreVideoUploads", tag: "premium" },
];

const SCOUT_ROWS: { feature: string; tag: TagKind }[] = [
  { feature: "basicPlayerSearch", tag: "included" },
  { feature: "viewPlayerProfiles", tag: "included" },
  { feature: "limitedVideoAccess", tag: "included" },
  { feature: "advancedSearch", tag: "scout" },
  { feature: "talentMap", tag: "scout" },
  { feature: "shortlists", tag: "scout" },
  { feature: "directMessaging", tag: "scout" },
  { feature: "aiScores", tag: "scout" },
  { feature: "playerComparison", tag: "scout" },
  { feature: "unlimitedProfiles", tag: "scout" },
];

const CLUB_ROWS: { feature: string; tag: TagKind }[] = [
  { feature: "clubDashboard", tag: "club" },
  { feature: "multipleScouts", tag: "club" },
  { feature: "sharedShortlists", tag: "club" },
  { feature: "internalNotes", tag: "club" },
  { feature: "pdfReports", tag: "club" },
  { feature: "verifiedClubBadge", tag: "club" },
];

const LOCKED_SHOWCASE: { feature: string }[] = [
  { feature: "premiumBoost" },
  { feature: "featuredVideo" },
  { feature: "aiImprovementTips" },
];

const PREMIUM_SHOWCASE: { feature: string }[] = [
  { feature: "premiumBoost" },
  { feature: "featuredVideo" },
  { feature: "featuredPlayerBadge" },
  { feature: "priorityScoutVisibility" },
  { feature: "aiImprovementTips" },
  { feature: "moreVideoUploads" },
];

const cardClass =
  "block rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4 text-left transition-colors hover:border-gn-border hover:bg-gn-surface/60";
const sectionTitle = "text-base font-semibold tracking-tight text-gn-text";
const sectionHint = "mt-1 text-xs text-gn-text-tertiary";
const rowClass =
  "flex items-center justify-between gap-3 rounded-lg border border-gn-border-subtle/80 bg-gn-surface/25 px-3 py-2.5 text-sm text-gn-text";
const badgeClass =
  "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

function tagBadgeClass(kind: TagKind): string {
  if (kind === "included" || kind === "unlocked")
    return `${badgeClass} border-emerald-500/35 bg-emerald-500/10 text-emerald-200`;
  if (kind === "locked") return `${badgeClass} border-gn-border-subtle bg-gn-surface/50 text-gn-text-tertiary`;
  if (kind === "premium") return `${badgeClass} border-gn-accent/40 bg-gn-accent/10 text-gn-accent`;
  if (kind === "scout") return `${badgeClass} border-sky-500/35 bg-sky-500/10 text-sky-200`;
  return `${badgeClass} border-violet-500/35 bg-violet-500/10 text-violet-200`;
}

export async function BenefitsPageBody() {
  const t = await getTranslations("benefits");
  const tk = (key: string) => t(key as never);

  return (
    <div className="min-w-0 max-w-full space-y-8 sm:space-y-10">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-gn-text sm:text-2xl">{t("benefitsTitle")}</h1>
        <p className="text-sm text-gn-text-secondary">{t("benefitsSubtitle")}</p>
      </header>

      <section className="rounded-xl border border-gn-border-subtle bg-gn-surface/20 p-4 sm:p-5" aria-labelledby="benefits-progress-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="benefits-progress-heading" className={sectionTitle}>
            {t("yourProgress")}
          </h2>
          <span className={badgeClass + " border-gn-border-subtle bg-gn-surface/50 text-gn-text-secondary"}>
            {t("comingSoon")}
          </span>
        </div>
        <p className="mt-2 text-sm text-gn-text-secondary">{t("notActive")}</p>
      </section>

      <section className="space-y-4" aria-labelledby="benefits-referral-heading">
        <h2 id="benefits-referral-heading" className={sectionTitle}>
          {t("referralRewards")}
        </h2>
        <p className="text-sm text-gn-text-secondary">{t("referralSectionIntro")}</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          <li className="rounded-xl border border-gn-border-subtle bg-gn-surface/25 p-4">
            <p className="font-medium text-gn-text">{t("invite3Players")}</p>
            <p className="mt-2 text-sm text-gn-text-secondary">{t("invite3PlayersReward")}</p>
          </li>
          <li className="rounded-xl border border-gn-border-subtle bg-gn-surface/25 p-4">
            <p className="font-medium text-gn-text">{t("invite10Players")}</p>
            <p className="mt-2 text-sm text-gn-text-secondary">{t("invite10PlayersReward")}</p>
          </li>
        </ul>
        <Link
          href="/settings#invite-friends"
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-3 text-sm font-semibold text-gn-text transition-colors hover:border-gn-border hover:bg-gn-surface/60 sm:w-auto"
        >
          {t("inviteFriends")}
        </Link>
      </section>

      <section className="space-y-3" aria-labelledby="benefits-locked-heading">
        <h2 id="benefits-locked-heading" className={sectionTitle}>
          {t("lockedBenefits")}
        </h2>
        <p className="text-sm text-gn-text-secondary">{t("lockedBenefitsIntro")}</p>
        <ul className="space-y-2">
          {LOCKED_SHOWCASE.map(({ feature }) => (
            <li key={feature} className={rowClass}>
              <span className="min-w-0 truncate">{tk(feature)}</span>
              <span className={tagBadgeClass("locked")}>{t("locked")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="benefits-premium-heading">
        <h2 id="benefits-premium-heading" className={sectionTitle}>
          {t("premiumBenefits")}
        </h2>
        <ul className="space-y-2">
          {PREMIUM_SHOWCASE.map(({ feature }) => (
            <li key={feature} className={rowClass}>
              <span className="min-w-0 truncate">{tk(feature)}</span>
              <span className={tagBadgeClass("premium")}>{t("availableWithPremium")}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/premium"
            className="inline-flex items-center justify-center rounded-xl border border-gn-accent/40 bg-gn-accent/15 px-4 py-2.5 text-sm font-semibold text-gn-accent transition hover:bg-gn-accent/25"
          >
            {t("upgradeToPremium")}
          </Link>
        </div>
        <p className="text-xs text-gn-text-tertiary">{t("hintPremiumCard")}</p>
      </section>

      <section className="space-y-3" aria-labelledby="benefits-player-heading">
        <h2 id="benefits-player-heading" className={sectionTitle}>
          {t("playerBenefits")}
        </h2>
        <ul className="space-y-2">
          {PLAYER_ROWS.map(({ feature, tag }) => (
            <li key={feature} className={rowClass}>
              <span className="min-w-0 truncate">{tk(feature)}</span>
              <span className={tagBadgeClass(tag)}>{t(tagKey(tag) as never)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="benefits-scout-heading">
        <h2 id="benefits-scout-heading" className={sectionTitle}>
          {t("scoutBenefits")}
        </h2>
        <ul className="space-y-2">
          {SCOUT_ROWS.map(({ feature, tag }) => (
            <li key={feature} className={rowClass}>
              <span className="min-w-0 truncate">{tk(feature)}</span>
              <span className={tagBadgeClass(tag)}>{t(tagKey(tag) as never)}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20"
        >
          {t("upgradeToScoutPro")}
        </Link>
        <p className="text-xs text-gn-text-tertiary">{t("hintScoutPricing")}</p>
      </section>

      <section className="space-y-3" aria-labelledby="benefits-club-heading">
        <h2 id="benefits-club-heading" className={sectionTitle}>
          {t("clubBenefits")}
        </h2>
        <ul className="space-y-2">
          {CLUB_ROWS.map(({ feature, tag }) => (
            <li key={feature} className={rowClass}>
              <span className="min-w-0 truncate">{tk(feature)}</span>
              <span className={tagBadgeClass(tag)}>{t(tagKey(tag) as never)}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
        >
          {t("viewClubPlans")}
        </Link>
        <p className="text-xs text-gn-text-tertiary">{t("hintClubPricing")}</p>
      </section>

      <section className="space-y-3 border-t border-gn-border-subtle pt-6" aria-labelledby="benefits-stats-heading">
        <h2 id="benefits-stats-heading" className={sectionTitle}>
          {t("profileStatistics")}
        </h2>
        <Link href="/player/stats" className={cardClass}>
          <span className="font-medium text-gn-text">{t("linkPlayerStats")}</span>
          <p className={sectionHint}>{t("hintStatsCard")}</p>
        </Link>
      </section>
    </div>
  );
}
