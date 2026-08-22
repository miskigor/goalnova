import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LandingAuthedHomeRedirect } from "@/components/landing/LandingAuthedHomeRedirect";
import { LandingImmersiveEntry } from "@/components/landing/LandingImmersiveEntry";
import { LandingSteps } from "@/components/landing/LandingSteps";
import { LandingFoundingPlayer } from "@/components/landing/LandingFoundingPlayer";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingSeoContent } from "@/components/landing/LandingSeoContent";
import { hrefWithLocale } from "@/i18n/routing";
import { getServerSiteOrigin, siteMetadataBase } from "@/lib/site/serverSiteOrigin";
import { buildBrandLinkPreviewMetadata } from "@/lib/seo/englishLinkPreview";
import { buildLocaleAlternates, localizedCanonicalPath } from "@/lib/seo/alternates";
import { buildLandingJsonLd } from "@/lib/seo/buildLandingJsonLd";
import { ogLocaleFromAppLocale } from "@/lib/seo/ogLocale";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const title = t("landingTitle");
  const description = t("landingDescription");
  const keywords = t("landingKeywords")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const origin = getServerSiteOrigin();
  const metadataBase = siteMetadataBase(origin);
  const canonicalPath = localizedCanonicalPath(locale, "/");
  const linkPreview = buildBrandLinkPreviewMetadata({ canonicalPath, origin });

  return {
    metadataBase,
    title,
    description,
    applicationName: "PitchRusch",
    keywords,
    alternates: {
      ...buildLocaleAlternates("/"),
      canonical: canonicalPath,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      ...linkPreview.openGraph,
      title,
      description,
      locale: ogLocaleFromAppLocale(locale),
    },
    twitter: {
      ...linkPreview.twitter,
      title,
      description,
    },
  };
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("landing");
  const tLang = await getTranslations("language");
  const meta = await getTranslations("metadata");
  const legal = await getTranslations("legal");
  const year = new Date().getFullYear();
  const h = (path: string) => hrefWithLocale(path, locale);
  const origin = getServerSiteOrigin();
  const pageUrl = origin
    ? `${origin.replace(/\/$/, "")}${localizedCanonicalPath(locale, "/")}`
    : undefined;

  const faqs = [
    { question: t("faq1Question"), answer: t("faq1Answer") },
    { question: t("faq2Question"), answer: t("faq2Answer") },
    { question: t("faq3Question"), answer: t("faq3Answer") },
  ];

  const siteJsonLd = buildLandingJsonLd({
    origin,
    pageUrl,
    siteDescription: meta("landingDescription"),
    locale,
    faq: faqs,
  });

  const steps: [
    { title: string; description: string },
    { title: string; description: string },
    { title: string; description: string },
  ] = [
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

      <LandingImmersiveEntry
        signupHref={h("/signup")}
        loginHref={h("/login")}
        headline={t("headline")}
        subhead={t("subhead")}
        ctaNewHere={t("ctaNewHere")}
        ctaHaveAccount={t("ctaHaveAccount")}
        changeLanguageLabel={tLang("changeLanguage")}
        heroImageAlt={t("heroImageAlt")}
      />

      <main>
        <LandingSteps steps={steps} />

        <LandingSeoContent
          aboutTitle={t("aboutTitle")}
          aboutLead={t("seoBrandLine")}
          aboutBody={t("aboutBody")}
          faqHeading={t("faqHeading")}
          faqs={faqs}
        />

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
