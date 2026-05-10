import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Bebas_Neue, Geist, Noto_Sans_Arabic } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LocaleRouteFallback } from "@/components/loading/LocaleRouteFallback";
import type { AppLocale } from "@/i18n/routing";
import { RTL_LOCALES, routing } from "@/i18n/routing";
import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";

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
  const metadataBase = origin ? new URL(origin) : undefined;

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
    },
    twitter: {
      card: "summary_large_image",
      title: t("rootTitle"),
      description: t("rootDescription"),
    },
    icons: {
      icon: "/icon",
      apple: "/apple-icon",
      shortcut: "/icon",
    },
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

async function LocaleIntlProvider({
  locale,
  children,
}: {
  locale: AppLocale;
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

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
      <body style={{ backgroundColor: "#000" }} className="flex min-h-dvh min-w-0 flex-col bg-gn-bg text-gn-text">
        <Suspense fallback={<LocaleRouteFallback />}>
          <LocaleIntlProvider locale={locale as AppLocale}>{children}</LocaleIntlProvider>
        </Suspense>
      </body>
    </html>
  );
}
