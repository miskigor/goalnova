import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Bebas_Neue, Geist, Noto_Sans_Arabic } from "next/font/google";
import type { AbstractIntlMessages } from "next-intl";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LocalePreferenceSync } from "@/components/i18n/LocalePreferenceSync";
import { LocaleRouteFallback } from "@/components/loading/LocaleRouteFallback";
import type { AppLocale } from "@/i18n/routing";
import { RTL_LOCALES, routing } from "@/i18n/routing";
import { buildBrandLinkPreviewMetadata } from "@/lib/seo/englishLinkPreview";
import {
  PITCHRUSCH_CRITICAL_FIRST_PAINT_CSS,
  PITCHRUSCH_CRITICAL_FIRST_PAINT_SCRIPT,
} from "@/lib/loading/criticalFirstPaint";
import { getServerSiteOrigin, siteMetadataBase } from "@/lib/site/serverSiteOrigin";
import { isMobileLayoutStableV2Enabled } from "@/lib/layout/mobileLayoutStableV2Flag";
import { MLV2_ROOT_ATTR } from "@/components/layout/mobile-v2/mobileLayoutStableV2.tokens";

/** Sets V2 html flag on app routes before first paint (avoids hydration size flash). */
const MLV2_HTML_ATTRIBUTE_SYNC_SCRIPT = `(function(){var p=location.pathname,re=/(?:^|\\/)(?:home|explore|profile|upload|challenges|scout-dashboard|scout-apply|admin|notifications|messages|settings|premium|benefits|rankings|discover|player)(?:\\/|$)/;if(!re.test(p))return;document.documentElement.setAttribute("${MLV2_ROOT_ATTR}","");})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
  preload: false,
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const origin = getServerSiteOrigin();
  const metadataBase = siteMetadataBase(origin);
  const canonicalPath = locale === routing.defaultLocale ? "/" : `/${locale}`;
  const linkPreview = buildBrandLinkPreviewMetadata({ canonicalPath, origin });

  return {
    metadataBase,
    title: {
      default: t("rootTitle"),
      template: t("rootTitleTemplate"),
    },
    description: t("rootDescription"),
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === routing.defaultLocale ? "/" : `/${l}`]),
      ),
    },
    openGraph: linkPreview.openGraph,
    twitter: linkPreview.twitter,
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: "/favicon.ico",
    },
    manifest: "/site.webmanifest",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  let messages: AbstractIntlMessages;
  try {
    messages = await getMessages();
  } catch (err) {
    console.error("[locale layout] getMessages failed; using English messages fallback", err);
    const mod = await import("../../messages/en.json");
    messages = mod.default as unknown as AbstractIntlMessages;
  }

  const dir = RTL_LOCALES.includes(locale as AppLocale) ? "rtl" : "ltr";
  const mobileLayoutStableV2 = isMobileLayoutStableV2Enabled();

  return (
    <html
      lang={locale}
      dir={dir}
      style={{ margin: 0, backgroundColor: "#000", colorScheme: "dark" }}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${bebasNeue.variable} ${notoArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="dark" />
        <style
          id="pitchrusch-critical-first-paint"
          dangerouslySetInnerHTML={{ __html: PITCHRUSCH_CRITICAL_FIRST_PAINT_CSS }}
        />
        <script
          id="pitchrusch-critical-first-paint-js"
          dangerouslySetInnerHTML={{ __html: PITCHRUSCH_CRITICAL_FIRST_PAINT_SCRIPT }}
        />
        {mobileLayoutStableV2 ? (
          <script
            id="mlv2-html-attribute-sync"
            dangerouslySetInnerHTML={{ __html: MLV2_HTML_ATTRIBUTE_SYNC_SCRIPT }}
          />
        ) : null}
      </head>
      <body
        style={{ margin: 0, backgroundColor: "#000", colorScheme: "dark" }}
        className="flex min-h-dvh min-w-0 max-w-full flex-col overflow-x-hidden bg-gn-bg text-gn-text"
      >
        <NextIntlClientProvider locale={locale as AppLocale} messages={messages}>
          <LocalePreferenceSync />
          <Suspense fallback={<LocaleRouteFallback />}>{children}</Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
