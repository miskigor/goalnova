import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bebas_Neue, Geist, Noto_Sans_Arabic } from "next/font/google";
import { documentHtmlLocale } from "@/lib/i18n/documentHtmlLocale";
import { PITCHRUSCH_CRITICAL_FIRST_PAINT_CSS } from "@/lib/loading/criticalFirstPaint";
import { LOCALE_HTML_SYNC_SCRIPT } from "@/lib/loading/bootSplash";
import { getServerSiteOrigin, siteMetadataBase } from "@/lib/site/serverSiteOrigin";
import "./globals.css";

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

const siteOrigin = getServerSiteOrigin();

export const metadata: Metadata = {
  metadataBase: siteMetadataBase(siteOrigin),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

type Props = {
  children: ReactNode;
};

/** Root shell — black first paint via inlined CSS only (no scripts, no boot splash DOM). */
export default async function RootLayout({ children }: Props) {
  const { lang, dir } = await documentHtmlLocale();

  return (
    <html
      lang={lang}
      dir={dir}
      translate="no"
      suppressHydrationWarning
      style={{ margin: 0, backgroundColor: "#000", colorScheme: "dark" }}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${bebasNeue.variable} ${notoArabic.variable} notranslate h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_HTML_SYNC_SCRIPT }} />
        <meta name="color-scheme" content="dark" />
        <meta name="google" content="notranslate" />
        <style
          id="pitchrusch-critical-first-paint"
          dangerouslySetInnerHTML={{ __html: PITCHRUSCH_CRITICAL_FIRST_PAINT_CSS }}
        />
      </head>
      <body
        style={{ margin: 0, backgroundColor: "#000", colorScheme: "dark" }}
        className="notranslate flex min-h-dvh min-w-0 max-w-full flex-col overflow-x-hidden bg-gn-bg text-gn-text"
      >
        {children}
      </body>
    </html>
  );
}
