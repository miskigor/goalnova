import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/brand/Logo";
import { LandingScrollLock } from "@/components/landing/LandingScrollLock";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { hrefWithLocale } from "@/i18n/routing";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";
import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const origin = getServerSiteOrigin();
  const metadataBase = origin ? new URL(origin) : undefined;
  const description = t("rootDescription");
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;

  return {
    metadataBase,
    title: t("landingTitle"),
    description,
    alternates: {
      canonical: localePrefix || "/",
    },
    openGraph: {
      type: "website",
      siteName: APP_DISPLAY_NAME,
      title: t("landingTitle"),
      description,
      locale,
      url: localePrefix || "/",
    },
    twitter: {
      card: "summary_large_image",
      title: t("landingTitle"),
      description,
    },
  };
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("landing");
  const legal = await getTranslations("legal");
  const year = new Date().getFullYear();
  const h = (path: string) => hrefWithLocale(path, locale);
  const origin = getServerSiteOrigin();
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const pageUrl = origin ? `${origin.replace(/\/$/, "")}${localePrefix || "/"}` : undefined;

  const siteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: APP_DISPLAY_NAME,
        ...(origin ? { url: origin } : {}),
      },
      {
        "@type": "WebSite",
        name: APP_DISPLAY_NAME,
        ...(pageUrl ? { url: pageUrl } : {}),
      },
    ],
  };

  return (
    <div
      className="relative flex h-[100dvh] min-h-0 min-w-0 flex-col overflow-hidden overscroll-y-none bg-black text-gn-text"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      <LandingScrollLock />

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div className="mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-xl sm:px-6 md:max-w-2xl md:py-8">
          <header className="relative z-20 w-full max-w-md shrink-0 border-b border-white/[0.04] pb-4 text-center sm:max-w-none sm:pb-5">
            <div className="mx-auto flex min-w-0 max-w-6xl flex-col items-center gap-3.5 sm:gap-4">
              <a
                href={h("/")}
                className="inline-flex shrink-0 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <Logo href={null} variant="landing" priority showWordmark={false} />
              </a>
              <LanguageSwitcher variant="landing" className="flex w-full justify-center" />
            </div>
          </header>

          <main className="relative z-10 flex min-h-0 w-full max-w-md flex-none flex-col justify-center py-5 max-md:min-h-0 sm:max-w-none sm:py-8">
            <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col items-center justify-center text-center">
              <h1 className="mt-1 text-balance text-xl font-semibold leading-snug tracking-tight text-gn-text sm:mt-2 sm:text-3xl sm:leading-snug md:text-2xl md:leading-snug lg:text-3xl lg:leading-tight">
                {t("headline")}
              </h1>

              <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-gn-text-secondary sm:mt-5 sm:max-w-lg sm:text-lg sm:leading-relaxed md:text-base">
                {t("subhead")}
              </p>

              <div className="mt-7 flex w-full max-w-sm flex-col items-stretch gap-3 sm:mt-10 sm:max-w-md sm:flex-row sm:justify-center sm:gap-4">
                <a
                  href={h("/login")}
                  className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-gn-accent px-6 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_12px_40px_-12px_rgba(249,115,22,0.55)] transition-[transform,background-color,box-shadow] hover:bg-gn-accent-hover active:scale-[0.99] sm:min-h-[2.75rem] sm:w-auto sm:min-w-[11rem] sm:px-8 sm:text-base md:min-h-[2.5rem] md:text-sm"
                >
                  {t("ctaPrimary")}
                </a>
                <a
                  href={h("/signup")}
                  className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-white/14 bg-white/[0.04] px-6 text-sm font-semibold text-gn-text transition-[border-color,background-color] hover:border-white/22 hover:bg-white/[0.08] sm:min-h-[2.75rem] sm:w-auto sm:min-w-[11rem] sm:px-8 sm:text-base md:min-h-[2.5rem] md:text-sm"
                >
                  {t("ctaSecondary")}
                </a>
              </div>
              <p className="mt-5 text-center sm:mt-6">
                <a
                  href={h("/support/account-recovery")}
                  className="text-sm font-medium text-gn-text-secondary underline decoration-white/20 underline-offset-4 transition hover:text-gn-text hover:decoration-gn-accent/60"
                >
                  {t("forgotPasswordLink")}
                </a>
              </p>
            </div>
          </main>

          <footer className="relative z-20 w-full max-w-md shrink-0 border-t border-white/[0.04] pt-4 text-center sm:max-w-none sm:pt-5">
            <div className="mx-auto flex min-w-0 max-w-6xl flex-col items-center">
              <nav
                className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-gn-text-secondary sm:text-sm md:text-xs"
                aria-label={legal("footer.navAriaLabel")}
              >
                <a
                  href={h("/terms")}
                  className="transition-colors hover:text-gn-text hover:underline"
                >
                  {legal("footer.terms")}
                </a>
                <a
                  href={h("/privacy")}
                  className="transition-colors hover:text-gn-text hover:underline"
                >
                  {legal("footer.privacy")}
                </a>
                <a
                  href={h("/content-policy")}
                  className="transition-colors hover:text-gn-text hover:underline"
                >
                  {legal("footer.contentPolicy")}
                </a>
                <a
                  href={h("/contact")}
                  className="transition-colors hover:text-gn-text hover:underline"
                >
                  {legal("footer.contact")}
                </a>
              </nav>
              <p className="text-center text-xs text-gn-text-tertiary sm:text-sm md:text-xs">
                {t("footer", { year })}
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
