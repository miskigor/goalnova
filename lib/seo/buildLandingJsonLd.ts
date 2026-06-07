import { APP_DISPLAY_NAME } from "@/lib/constants/brand";

type LandingJsonLdInput = {
  origin: string | null;
  pageUrl: string | undefined;
  siteDescription: string;
  faq: Array<{ question: string; answer: string }>;
};

/** Organization + WebSite (+ SearchAction) + FAQPage for the marketing landing. */
export function buildLandingJsonLd({
  origin,
  pageUrl,
  siteDescription,
  faq,
}: LandingJsonLdInput): Record<string, unknown> {
  const siteOrigin = origin?.replace(/\/$/, "");
  const searchTarget = siteOrigin ? `${siteOrigin}/search?q={search_term_string}` : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": siteOrigin ? `${siteOrigin}/#organization` : undefined,
        name: APP_DISPLAY_NAME,
        alternateName: ["pitchrusch", "Pitch Rusch"],
        url: siteOrigin,
        logo: siteOrigin ? `${siteOrigin}/icon-512.png` : undefined,
        sameAs: [],
      },
      {
        "@type": "WebSite",
        "@id": siteOrigin ? `${siteOrigin}/#website` : undefined,
        name: APP_DISPLAY_NAME,
        alternateName: "pitchrusch",
        description: siteDescription,
        url: pageUrl ?? siteOrigin,
        publisher: siteOrigin ? { "@id": `${siteOrigin}/#organization` } : undefined,
        inLanguage: ["en", "hr", "de", "es", "fr", "it", "pt", "nl", "tr", "ar", "bs", "sr"],
        ...(searchTarget
          ? {
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: searchTarget,
                },
                "query-input": "required name=search_term_string",
              },
            }
          : {}),
      },
      {
        "@type": "FAQPage",
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
