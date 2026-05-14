import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const PLAYER_ROWS: { feature: string }[] = [
  { feature: "leaderboards" },
  { feature: "profileStatistics" },
  { feature: "featuredPlayerBadge" },
  { feature: "priorityScoutVisibility" },
];

const SCOUT_ROWS: { feature: string }[] = [
  { feature: "basicPlayerSearch" },
  { feature: "viewPlayerProfiles" },
  { feature: "limitedVideoAccess" },
];

const cardClass =
  "block rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4 text-left transition-colors hover:border-gn-border hover:bg-gn-surface/60";
const sectionTitle = "text-base font-semibold tracking-tight text-gn-text";
const sectionHint = "mt-1 text-xs text-gn-text-tertiary";
const rowClass =
  "flex items-center justify-between gap-3 rounded-lg border border-gn-border-subtle/80 bg-gn-surface/25 px-3 py-2.5 text-sm text-gn-text";
const badgeClass =
  "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";
const statusNeutralClass =
  badgeClass + " border-gn-border-subtle bg-gn-surface/50 text-gn-text-secondary";

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
          <span className={statusNeutralClass}>{t("comingSoon")}</span>
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

      <section className="space-y-3" aria-labelledby="benefits-player-heading">
        <h2 id="benefits-player-heading" className={sectionTitle}>
          {t("playerBenefits")}
        </h2>
        <p className="text-sm text-gn-text-secondary">{t("playerBenefitsStatusIntro")}</p>
        <ul className="space-y-2">
          {PLAYER_ROWS.map(({ feature }) => (
            <li key={feature} className={rowClass}>
              <span className="min-w-0 truncate">{tk(feature)}</span>
              <span className={statusNeutralClass}>{t("comingSoon")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="benefits-scout-heading">
        <h2 id="benefits-scout-heading" className={sectionTitle}>
          {t("scoutBenefits")}
        </h2>
        <p className="text-sm text-gn-text-secondary">{t("scoutBenefitsStatusIntro")}</p>
        <ul className="space-y-2">
          {SCOUT_ROWS.map(({ feature }) => (
            <li key={feature} className={rowClass}>
              <span className="min-w-0 truncate">{tk(feature)}</span>
              <span className={statusNeutralClass}>{t("included")}</span>
            </li>
          ))}
        </ul>
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
