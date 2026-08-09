import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PremiumSettingsSection } from "@/components/settings/PremiumSettingsSection";
import { AppAccountQuickLinks } from "@/components/layout/AppAccountQuickLinks";
import {
  SettingsInstallAppRow,
  SettingsNotificationsRow,
} from "@/components/pwa/SettingsPwaSection";

const rowClass =
  "flex w-full items-center justify-between rounded-xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-3.5 text-left text-xs text-gn-text transition-colors hover:border-gn-border hover:bg-gn-surface/60 max-lg:px-2 max-lg:py-1.5";

const soonRowClass =
  "flex w-full cursor-default items-center justify-between rounded-xl border border-gn-border-subtle bg-gn-surface/25 px-4 py-3.5 text-left text-xs text-gn-text-secondary max-lg:px-2 max-lg:py-1.5";

export async function SettingsMainPage() {
  const t = await getTranslations("settings");
  const tProfile = await getTranslations("profile");
  const tNav = await getTranslations("nav");

  return (
    <div className="min-w-0 max-w-full space-y-5 max-lg:space-y-2 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gn-text max-lg:text-base sm:text-2xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-xs text-gn-text-secondary sm:text-sm">{t("subtitle")}</p>
      </div>

      <AppAccountQuickLinks />

      <SettingsInstallAppRow />

      <section
        className="space-y-2 rounded-xl border border-[#FF8A00]/30 bg-[#FF8A00]/8 p-3 max-lg:p-2"
        aria-label={t("notifications")}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
          {t("notifications")}
        </p>
        <Link href="/notifications?tab=activity" className={rowClass}>
          <span>🔔 {tNav("notifications")}</span>
          <span className="text-gn-text-tertiary">→</span>
        </Link>
        <SettingsNotificationsRow
          label={t("pushNotifications")}
          rowClassName={rowClass}
        />
      </section>

      <PremiumSettingsSection />

      <div className="rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4 max-lg:p-2">
        <p className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
          {t("language")}
        </p>
        <p className="mt-1 text-sm text-gn-text-secondary">{t("languageHint")}</p>
        <div className="mt-3">
          <LanguageSwitcher selectClassName="w-full max-w-none cursor-pointer rounded-xl border border-gn-border bg-gn-surface px-3 py-2.5 text-sm font-medium text-gn-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gn-accent/40 max-lg:px-2 max-lg:py-1.5" />
        </div>
      </div>

      <ul className="space-y-2 max-lg:space-y-1.5">
        <li>
          <Link href="/settings/profile" className={rowClass}>
            <span>{tProfile("title")}</span>
            <span className="text-gn-text-tertiary">→</span>
          </Link>
        </li>
        <li>
          <div className={soonRowClass} aria-disabled="true">
            <span>{t("privacy")}</span>
            <span className="text-gn-text-tertiary">{t("soon")}</span>
          </div>
        </li>
        <li>
          <div className={soonRowClass} aria-disabled="true">
            <span>{t("appearance")}</span>
            <span className="text-gn-text-tertiary">{t("soon")}</span>
          </div>
        </li>
      </ul>

      <div className="border-t border-gn-border-subtle pt-4 max-lg:pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}
