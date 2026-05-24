import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingSteps } from "@/components/landing/LandingSteps";
import { LandingFoundingPlayer } from "@/components/landing/LandingFoundingPlayer";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHorizontalScrollRecovery } from "@/components/landing/LandingHorizontalScrollRecovery";
import { LandingIgDebugOverlay } from "@/components/landing/LandingIgDebugOverlay";
import { hrefWithLocale } from "@/i18n/routing";
import { getServerSiteOrigin, siteMetadataBase } from "@/lib/site/serverSiteOrigin";
import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const origin = getServerSiteOrigin();
  const metadataBase = siteMetadataBase(origin);
  const description = t("landingDescription");
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

  const steps: [{ title: string; description: string }, { title: string; description: string }, { title: string; description: string }] = [
    { title: t("step1Title"), description: t("step1Desc") },
    { title: t("step2Title"), description: t("step2Desc") },
    { title: t("step3Title"), description: t("step3Desc") },
  ];

  return (
    <div
      data-landing-root
      className="box-border flex w-full min-w-0 max-w-full flex-col overflow-x-clip bg-black text-gn-text min-h-[100svh] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />

      <LandingIgDebugOverlay />
      <LandingHorizontalScrollRecovery />

      <LandingNav
        homeHref={h("/")}
        loginHref={h("/login")}
        signupHref={h("/signup")}
        loginLabel={t("navLogin")}
        joinLabel={t("navJoin")}
      />

      <main className="box-border w-full min-w-0 max-w-full flex-1 overflow-x-clip">
        <LandingHero
          signupHref={h("/signup")}
          challengesHref={h("/challenges")}
          headline={t("headline")}
          subhead={t("subhead")}
          ctaPrimary={t("ctaPrimary")}
          ctaSecondary={t("ctaSecondary")}
          previewBadge={t("previewBadge")}
          previewCaption={t("previewCaption")}
        />

        <LandingSteps steps={steps} />

        <LandingFoundingPlayer
          signupHref={h("/signup")}
          title={t("foundingTitle")}
          body={t("foundingBody")}
          bullets={[t("foundingBullet1"), t("foundingBullet2"), t("foundingBullet3")]}
          cta={t("foundingCta")}
        />
      </main>

      <LandingFooter
        footerText={t("footer", { year })}
        termsHref={h("/terms")}
        privacyHref={h("/privacy")}
        contentPolicyHref={h("/content-policy")}
        contactHref={h("/contact")}
        termsLabel={legal("footer.terms")}
        privacyLabel={legal("footer.privacy")}
        contentPolicyLabel={legal("footer.contentPolicy")}
        contactLabel={legal("footer.contact")}
        navAriaLabel={legal("footer.navAriaLabel")}
      />
    </div>
  );
}
