import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/brand/Logo";
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
    <div className="relative flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-gn-bg">
      {/* Ambient orange glow — layered for depth */}
      <div className="pointer-events-none absolute inset-0 overflow-x-clip" aria-hidden>
        <div className="absolute -top-32 start-1/2 h-[min(120vw,28rem)] w-[min(120vw,28rem)] -translate-x-1/2 rounded-full bg-gn-accent/[0.18] blur-[100px] sm:h-[32rem] sm:w-[32rem] sm:blur-[120px]" />
        <div className="absolute top-1/3 -end-24 h-72 w-72 rounded-full bg-gn-accent/[0.08] blur-[90px] sm:end-0 sm:h-96 sm:w-96" />
        <div className="absolute -bottom-20 start-[-10%] h-64 w-[110%] rounded-[100%] bg-gradient-to-t from-gn-accent/[0.07] to-transparent blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.15),transparent)]" />
      </div>

      {/* Subtle pitch grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(250,250,250,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(250,250,250,0.5) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <header className="relative z-20 border-b border-white/[0.06] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex min-w-0 max-w-6xl flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <a
            href={h("/")}
            className="inline-flex shrink-0 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg"
          >
            <Logo href={null} variant="landing" priority showWordmark={false} />
          </a>
          <div className="flex w-full min-w-0 flex-1 items-center justify-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
            <LanguageSwitcher variant="landing" />
            <a
              href={h("/login")}
              className="hidden whitespace-nowrap text-sm font-medium text-gn-text-secondary transition-colors hover:text-gn-text sm:inline"
            >
              {t("login")}
            </a>
            <a
              href={h("/signup")}
              className="hidden whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-gn-text transition-colors hover:border-white/20 hover:bg-white/[0.07] sm:inline-flex"
            >
              {t("signup")}
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 md:pt-20">
        <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col items-center text-center">
          <h1 className="mt-2 text-balance text-[1.75rem] font-semibold leading-[1.12] tracking-tight text-gn-text sm:mt-4 sm:text-4xl sm:leading-[1.1] md:text-5xl md:leading-[1.08]">
            {t("headline")}
          </h1>

          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-gn-text-secondary sm:mt-6 sm:max-w-lg sm:text-lg sm:leading-relaxed">
            {t("subhead")}
          </p>

          <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:mt-12 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href={h("/signup")}
              className="inline-flex h-12 min-h-[3rem] w-full items-center justify-center rounded-full bg-gn-accent px-8 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_12px_40px_-12px_rgba(249,115,22,0.55)] transition-[transform,background-color,box-shadow] hover:bg-gn-accent-hover active:scale-[0.99] sm:w-auto sm:min-w-[11rem]"
            >
              {t("ctaPrimary")}
            </a>
            <a
              href={h("/home")}
              className="inline-flex h-12 min-h-[3rem] w-full items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-8 text-sm font-semibold text-gn-text backdrop-blur-sm transition-[border-color,background-color] hover:border-white/20 hover:bg-white/[0.06] sm:w-auto sm:min-w-[11rem]"
            >
              {t("ctaSecondary")}
            </a>
          </div>

          <p className="mt-auto pt-14 text-center sm:pt-20">
            <a
              href={h("/login")}
              className="text-sm font-medium text-gn-text-tertiary underline-offset-4 transition-colors hover:text-gn-text-secondary sm:hidden"
            >
              {t("login")}
            </a>
          </p>
        </div>
      </main>

      <footer className="relative z-20 border-t border-white/[0.06] px-4 py-6 sm:px-6">
        <div className="mx-auto min-w-0 max-w-6xl">
          <nav
            className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-gn-text-secondary"
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
          <p className="text-center text-xs text-gn-text-tertiary">
            {t("footer", { year })}
          </p>
        </div>
      </footer>
    </div>
  );
}
