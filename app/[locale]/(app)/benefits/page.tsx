import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("benefitsTitle") };
}

const cardClass =
  "block rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4 text-left transition-colors hover:border-gn-border hover:bg-gn-surface/60";

export default async function BenefitsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("benefits");

  return (
    <div className="min-w-0 max-w-full space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gn-text sm:text-2xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-gn-text-secondary">{t("subtitle")}</p>
      </div>
      <p className="text-sm text-gn-text-secondary">{t("intro")}</p>
      <ul className="space-y-2">
        <li>
          <Link href="/premium" className={cardClass}>
            <span className="font-medium text-gn-text">{t("linkPremium")}</span>
            <p className="mt-1 text-xs text-gn-text-tertiary">{t("hintPremium")}</p>
          </Link>
        </li>
        <li>
          <Link href="/settings#invite-friends" className={cardClass}>
            <span className="font-medium text-gn-text">{t("linkInvite")}</span>
            <p className="mt-1 text-xs text-gn-text-tertiary">{t("hintInvite")}</p>
          </Link>
        </li>
        <li>
          <Link href="/player/stats" className={cardClass}>
            <span className="font-medium text-gn-text">{t("linkStats")}</span>
            <p className="mt-1 text-xs text-gn-text-tertiary">{t("hintStats")}</p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
