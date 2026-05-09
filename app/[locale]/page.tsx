import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/brand/Logo";
import { LandingScrollLock } from "@/components/landing/LandingScrollLock";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { hrefWithLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("landingTitle") };
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("landing");
  const legal = await getTranslations("legal");
  const year = new Date().getFullYear();
  const h = (path: string) => hrefWithLocale(path, locale);

  return (
    <div
      className="relative flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-black text-gn-text max-md:h-[100dvh] max-md:min-h-0 max-md:overflow-hidden max-md:overscroll-y-none"
    >
      <LandingScrollLock />

      <div className="flex min-h-0 flex-1 flex-col md:min-h-dvh md:justify-center">
        <div className="mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col items-center px-4 py-4 max-md:justify-center sm:max-w-xl sm:px-6 md:max-w-2xl md:justify-start md:py-10">
          <header className="relative z-20 w-full max-w-md shrink-0 border-b border-white/[0.04] pb-4 text-center sm:max-w-none sm:pb-5">
            <div className="mx-auto flex min-w-0 max-w-6xl flex-col items-center gap-3.5 sm:gap-4">
              <a
                href={h("/")}
                className="inline-flex shrink-0 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <Logo href={null} variant="landing" priority showWordmark={false} />
              </a>
              <LanguageSwitcher
                variant="landing"
                className="flex w-full justify-center [&_select]:text-center"
              />
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <a
                  href={h("/login")}
                  className="whitespace-nowrap text-sm font-medium text-gn-text-secondary transition-colors hover:text-gn-text sm:text-base"
                >
                  {t("login")}
                </a>
                <a
                  href={h("/signup")}
                  className="inline-flex min-h-[2.75rem] items-center whitespace-nowrap rounded-full border border-white/14 bg-white/[0.06] px-5 py-2 text-sm font-semibold text-gn-text transition-colors hover:border-white/26 hover:bg-white/[0.11] sm:min-h-0 sm:px-6 sm:py-2.5 sm:text-base"
                >
                  {t("signup")}
                </a>
              </div>
            </div>
          </header>

          <main className="relative z-10 flex min-h-0 w-full max-w-md flex-none flex-col justify-center py-5 max-md:min-h-0 sm:max-w-none sm:flex-1 sm:py-8">
            <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col items-center justify-center text-center">
              <h1 className="mt-1 text-balance text-xl font-semibold leading-snug tracking-tight text-gn-text sm:mt-2 sm:text-3xl sm:leading-snug md:text-4xl md:leading-tight">
                {t("headline")}
              </h1>

              <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-gn-text-secondary sm:mt-5 sm:max-w-lg sm:text-lg sm:leading-relaxed">
                {t("subhead")}
              </p>

              <div className="mt-7 flex w-full max-w-sm flex-col items-stretch gap-3 sm:mt-10 sm:max-w-md sm:flex-row sm:justify-center sm:gap-4">
                <a
                  href={h("/signup")}
                  className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-gn-accent px-6 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_12px_40px_-12px_rgba(249,115,22,0.55)] transition-[transform,background-color,box-shadow] hover:bg-gn-accent-hover active:scale-[0.99] sm:min-h-[2.75rem] sm:w-auto sm:min-w-[11rem] sm:px-8 sm:text-base"
                >
                  {t("ctaPrimary")}
                </a>
                <a
                  href={h("/home")}
                  className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-white/14 bg-white/[0.04] px-6 text-sm font-semibold text-gn-text transition-[border-color,background-color] hover:border-white/22 hover:bg-white/[0.08] sm:min-h-[2.75rem] sm:w-auto sm:min-w-[11rem] sm:px-8 sm:text-base"
                >
                  {t("ctaSecondary")}
                </a>
              </div>
            </div>
          </main>

          <footer className="relative z-20 w-full max-w-md shrink-0 border-t border-white/[0.04] pt-4 text-center sm:max-w-none sm:pt-5">
            <div className="mx-auto flex min-w-0 max-w-6xl flex-col items-center">
              <nav
                className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-gn-text-secondary sm:text-sm"
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
              <p className="text-center text-xs text-gn-text-tertiary sm:text-sm">
                {t("footer", { year })}
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
