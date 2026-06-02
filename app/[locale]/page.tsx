import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LandingAuthedHomeRedirect } from "@/components/landing/LandingAuthedHomeRedirect";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingSteps } from "@/components/landing/LandingSteps";
import { LandingFoundingPlayer } from "@/components/landing/LandingFoundingPlayer";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { hrefWithLocale } from "@/i18n/routing";
import { getServerSiteOrigin, siteMetadataBase } from "@/lib/site/serverSiteOrigin";
import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import { SITE_SEO_KEYWORDS } from "@/lib/seo/brandMetadata";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const origin = getServerSiteOrigin();
  const metadataBase = siteMetadataBase(origin);
  const title = t("landingTitle");
  const description = t("landingDescription");
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const canonicalPath = localePrefix || "/";

  return {
    metadataBase,
    title,
    description,
    applicationName: APP_DISPLAY_NAME,
    keywords: [...SITE_SEO_KEYWORDS],
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === routing.defaultLocale ? "/" : `/${l}`]),
      ),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      type: "website",
      siteName: APP_DISPLAY_NAME,
      title,
      description,
      locale,
      url: canonicalPath,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${APP_DISPLAY_NAME} — Football talent discovery`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image"],
    },
  };
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("landing");
  const meta = await getTranslations("metadata");
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
        alternateName: ["pitchrusch", "Pitch Rusch"],
        ...(origin ? { url: origin } : {}),
      },
      {
        "@type": "WebSite",
        name: APP_DISPLAY_NAME,
        alternateName: "pitchrusch",
        description: meta("landingDescription"),
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
    <div className="min-h-[100dvh] bg-black text-gn-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />

      <LandingAuthedHomeRedirect />

      <LandingNav
        homeHref={h("/")}
        loginHref={h("/login")}
        signupHref={h("/signup")}
        loginLabel={t("navLogin")}
        joinLabel={t("navJoin")}
      />

      <main>
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
