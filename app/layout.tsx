import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bebas_Neue, Geist, Noto_Sans_Arabic } from "next/font/google";
import {
  PITCHRUSCH_CRITICAL_FIRST_PAINT_CSS,
  PITCHRUSCH_CRITICAL_FIRST_PAINT_SCRIPT,
} from "@/lib/loading/criticalFirstPaint";
import { BOOT_SPLASH_CSS, LOCALE_HTML_SYNC_SCRIPT } from "@/lib/loading/bootSplash";
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

export const metadata: Metadata = {
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

/**
 * Root shell renders synchronously (black + boot splash) before locale/messages stream.
 * Fixes long white screen on cold opens (e.g. Instagram in-app browser).
 */
export default function RootLayout({ children }: Props) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      style={{ margin: 0, backgroundColor: "#000", colorScheme: "dark" }}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${bebasNeue.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <head>
        <meta name="color-scheme" content="dark" />
        <link
          rel="preload"
          href="/brand/pitchrusch-logo.svg"
          as="image"
          type="image/svg+xml"
        />
        <style
          id="pitchrusch-critical-first-paint"
          dangerouslySetInnerHTML={{
            __html: `${PITCHRUSCH_CRITICAL_FIRST_PAINT_CSS}\n${BOOT_SPLASH_CSS}`,
          }}
        />
        <script
          id="pitchrusch-critical-first-paint-js"
          dangerouslySetInnerHTML={{ __html: PITCHRUSCH_CRITICAL_FIRST_PAINT_SCRIPT }}
        />
        <script
          id="pitchrusch-locale-html-sync"
          dangerouslySetInnerHTML={{ __html: LOCALE_HTML_SYNC_SCRIPT }}
        />
      </head>
      <body
        style={{ margin: 0, backgroundColor: "#000", colorScheme: "dark" }}
        className="flex min-h-dvh min-w-0 max-w-full flex-col overflow-x-hidden bg-gn-bg text-gn-text"
      >
        <div id="pitchrusch-boot-splash" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/pitchrusch-logo.svg"
            alt=""
            width={80}
            height={80}
            decoding="async"
            fetchPriority="high"
          />
          <div className="pitchrusch-boot-spinner" />
        </div>
        {children}
      </body>
    </html>
  );
}
