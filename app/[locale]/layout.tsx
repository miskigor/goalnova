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
import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import { getServerSiteOrigin, siteMetadataBase } from "@/lib/site/serverSiteOrigin";

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

  return {
    metadataBase,
    title: {
      default: t("rootTitle"),
      template: t("rootTitleTemplate"),
    },
    description: t("rootDescription"),
    alternates: {
      canonical: locale === routing.defaultLocale ? "/" : `/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === routing.defaultLocale ? "/" : `/${l}`]),
      ),
    },
    openGraph: {
      type: "website",
      siteName: APP_DISPLAY_NAME,
      title: t("rootTitle"),
      description: t("rootDescription"),
      locale,
      url: locale === routing.defaultLocale ? "/" : `/${locale}`,
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
      title: t("rootTitle"),
      description: t("rootDescription"),
      images: ["/twitter-image"],
    },
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

  return (
    <html
      lang={locale}
      dir={dir}
      style={{ backgroundColor: "#000" }}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${bebasNeue.variable} ${notoArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        style={{ backgroundColor: "#000" }}
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
