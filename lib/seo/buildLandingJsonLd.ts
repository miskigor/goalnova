import { APP_DISPLAY_NAME, ORGANIZATION_SAME_AS } from "@/lib/constants/brand";

type LandingJsonLdInput = {
  origin: string | null;
  pageUrl: string | undefined;
  siteDescription: string;
  locale: string;
  faq: Array<{ question: string; answer: string }>;
};

/** Organization + WebSite + SoftwareApplication + FAQPage for the marketing landing. */
export function buildLandingJsonLd({
  origin,
  pageUrl,
  siteDescription,
  locale,
  faq,
}: LandingJsonLdInput): Record<string, unknown> {
  const siteOrigin = origin?.replace(/\/$/, "");
  const organizationId = siteOrigin ? `${siteOrigin}/#organization` : undefined;
  const websiteId = siteOrigin ? `${siteOrigin}/#website` : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: APP_DISPLAY_NAME,
        alternateName: ["pitchrusch", "Pitch Rusch"],
        description: siteDescription,
        url: siteOrigin,
        logo: siteOrigin ? `${siteOrigin}/icon-512.png` : undefined,
        sameAs: [...ORGANIZATION_SAME_AS],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: APP_DISPLAY_NAME,
        alternateName: "pitchrusch",
        description: siteDescription,
        url: pageUrl ?? siteOrigin,
        inLanguage: locale,
        publisher: organizationId ? { "@id": organizationId } : undefined,
      },
      {
        "@type": "SoftwareApplication",
        name: APP_DISPLAY_NAME,
        applicationCategory: "SportsApplication",
        operatingSystem: "Web",
        description: siteDescription,
        url: pageUrl ?? siteOrigin,
        inLanguage: locale,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
        },
        publisher: organizationId ? { "@id": organizationId } : undefined,
      },
      {
        "@type": "FAQPage",
        inLanguage: locale,
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };
}
