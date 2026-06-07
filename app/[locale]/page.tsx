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
import { buildBrandLinkPreviewMetadata } from "@/lib/seo/englishLinkPreview";
import { buildLocaleAlternates, localizedCanonicalPath } from "@/lib/seo/alternates";
import { buildLandingJsonLd } from "@/lib/seo/buildLandingJsonLd";
import { SITE_SEO_DESCRIPTION, SITE_SEO_KEYWORDS, SITE_SEO_TITLE } from "@/lib/seo/brandMetadata";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const origin = getServerSiteOrigin();
  const metadataBase = siteMetadataBase(origin);
  const canonicalPath = localizedCanonicalPath(locale, "/");
  const linkPreview = buildBrandLinkPreviewMetadata({ canonicalPath, origin });

  return {
    metadataBase,
    title: SITE_SEO_TITLE,
    description: SITE_SEO_DESCRIPTION,
    applicationName: "PitchRusch",
    keywords: [...SITE_SEO_KEYWORDS],
    alternates: {
      ...buildLocaleAlternates("/"),
      canonical: canonicalPath,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: linkPreview.openGraph,
    twitter: linkPreview.twitter,
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
  const pageUrl = origin
    ? `${origin.replace(/\/$/, "")}${localizedCanonicalPath(locale, "/")}`
    : undefined;

  const siteJsonLd = buildLandingJsonLd({
    origin,
    pageUrl,
    siteDescription: meta("landingDescription"),
    faq: [
      { question: t("step1Title"), answer: t("step1Desc") },
      { question: t("step2Title"), answer: t("step2Desc") },
      { question: t("step3Title"), answer: t("step3Desc") },
      { question: t("foundingTitle"), answer: t("foundingBody") },
    ],
  });

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
          brandIntro={t("seoBrandLine")}
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
