import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { PremiumSettingsSection } from "@/components/settings/PremiumSettingsSection";
import { SettingsInviteFriendsSection } from "@/components/settings/SettingsInviteFriendsSection";
import { AppAccountQuickLinks } from "@/components/layout/AppAccountQuickLinks";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("settingsTitle") };
}

const rowClass =
  "flex w-full items-center justify-between rounded-xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-3.5 text-left text-xs text-gn-text transition-colors hover:border-gn-border hover:bg-gn-surface/60 max-lg:px-2 max-lg:py-1.5";

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("settings");
  const tProfile = await getTranslations("profile");

  return (
    <div className="min-w-0 max-w-full space-y-5 max-lg:space-y-2 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gn-text max-lg:text-base sm:text-2xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-xs text-gn-text-secondary sm:text-sm">{t("subtitle")}</p>
      </div>

      <AppAccountQuickLinks />

      <PremiumSettingsSection />

      <SettingsInviteFriendsSection />

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
          <button type="button" className={rowClass}>
            <span>{t("notifications")}</span>
            <span className="text-gn-text-tertiary">{t("soon")}</span>
          </button>
        </li>
        <li>
          <button type="button" className={rowClass}>
            <span>{t("privacy")}</span>
            <span className="text-gn-text-tertiary">{t("soon")}</span>
          </button>
        </li>
        <li>
          <button type="button" className={rowClass}>
            <span>{t("appearance")}</span>
            <span className="text-gn-text-tertiary">{t("soon")}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
