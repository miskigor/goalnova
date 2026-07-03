import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bebas_Neue, Geist, Noto_Sans_Arabic } from "next/font/google";
import { PITCHRUSCH_CRITICAL_FIRST_PAINT_CSS } from "@/lib/loading/criticalFirstPaint";
import { buildBrandLinkPreviewMetadata, brandOgImageAbsoluteUrl } from "@/lib/seo/englishLinkPreview";
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
const rootLinkPreview = buildBrandLinkPreviewMetadata({
  canonicalPath: "/",
  origin: siteOrigin,
});
const ogImageUrl = brandOgImageAbsoluteUrl(siteOrigin);

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
  openGraph: rootLinkPreview.openGraph,
  twitter: rootLinkPreview.twitter,
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
export default function RootLayout({ children }: Props) {
  return (
    <html
      lang="en"
      dir="ltr"
      translate="no"
      suppressHydrationWarning
      style={{ margin: 0, backgroundColor: "#000", colorScheme: "dark" }}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${bebasNeue.variable} ${notoArabic.variable} notranslate h-full antialiased`}
    >
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="google" content="notranslate" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:secure_url" content={ogImageUrl} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="1200" />
        <link rel="image_src" href={ogImageUrl} />
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
