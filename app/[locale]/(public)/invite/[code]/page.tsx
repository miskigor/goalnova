import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClubInviteBootstrap } from "@/components/clubs/ClubInviteBootstrap";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { GuestPublicCallout } from "@/components/layout/GuestPublicCallout";
import { Link } from "@/i18n/navigation";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { buildPublicPageMetadata } from "@/lib/seo/buildPublicPageMetadata";

type Props = { params: Promise<{ locale: string; code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "clubs" });
  return buildPublicPageMetadata({
    locale,
    pathname: `/invite/${code}`,
    title: `${t("invitePageTitle")} · PitchRusch`,
    description: t("invitePageSubtitle"),
    index: false,
  });
}

export default async function ClubInvitePage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "clubs" });

  return (
    <AppMobileTabPageShell>
      <ClubInviteBootstrap />
      <GuestPublicCallout />
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <p className="text-4xl" aria-hidden>
          🏟
        </p>
        <h1 className="text-xl font-bold text-gn-text">{t("invitePageTitle")}</h1>
        <p className="text-sm text-gn-text-secondary">
          {t("invitePageSubtitle", { code: code.toUpperCase() })}
        </p>
        <Link href="/login" className={GN_PRIMARY_BUTTON_CLASS}>
          {t("inviteSignInCta")}
        </Link>
        <Link href="/clubs" className="text-sm text-gn-accent hover:underline">
          {t("backToClubs")}
        </Link>
      </div>
    </AppMobileTabPageShell>
  );
}
