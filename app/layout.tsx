import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bebas_Neue, Geist, Noto_Sans_Arabic } from "next/font/google";
import { PITCHRUSCH_CRITICAL_FIRST_PAINT_CSS } from "@/lib/loading/criticalFirstPaint";
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
  applicationName: "PitchRusch",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PitchRusch",
  },
  formatDetection: {
    telephone: false,
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
  manifest: "/manifest.json",
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#FF8A00" },
    { media: "(prefers-color-scheme: light)", color: "#FF8A00" },
  ],
  colorScheme: "dark",
};

type Props = {
  children: ReactNode;
};

/** Root shell — black first paint via inlined CSS only (no scripts, no boot splash DOM). */
export default function RootLayout({ children }: Props) {
  return (
    <html
      lang="en"
      dir="ltr"
      translate="no"
      suppressHydrationWarning
      style={{ margin: 0, backgroundColor: "#111111", colorScheme: "dark" }}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${bebasNeue.variable} ${notoArabic.variable} notranslate h-full antialiased`}
    >
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#FF8A00" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PitchRusch" />
        <meta name="google" content="notranslate" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <style
          id="pitchrusch-critical-first-paint"
          dangerouslySetInnerHTML={{ __html: PITCHRUSCH_CRITICAL_FIRST_PAINT_CSS }}
        />
      </head>
      <body
        style={{ margin: 0, backgroundColor: "#111111", colorScheme: "dark" }}
        className="notranslate flex min-h-dvh min-w-0 max-w-full flex-col overflow-x-hidden bg-gn-bg text-gn-text"
      >
        {children}
      </body>
    </html>
  );
}
