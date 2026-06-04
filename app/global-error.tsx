"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./globals.css";
import { GN_PRIMARY_BUTTON_CLASS, GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import type { AppLocale } from "@/i18n/routing";
import { RTL_LOCALES, routing } from "@/i18n/routing";
import enData from "../messages/en.json";

type ErrMessages = typeof enData.errors;

function segmentLocale(pathname: string): AppLocale {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg && (routing.locales as readonly string[]).includes(seg)) {
    return seg as AppLocale;
  }
  return routing.defaultLocale;
}

function homeHref(locale: AppLocale): string {
  return locale === routing.defaultLocale ? "/home" : `/${locale}/home`;
}

function loadLocaleMessages(locale: AppLocale): Promise<{ default: typeof enData }> {
  switch (locale) {
    case "hr":
      return import("../messages/hr.json");
    case "de":
      return import("../messages/de.json");
    case "it":
      return import("../messages/it.json");
    case "fr":
      return import("../messages/fr.json");
    case "es":
      return import("../messages/es.json");
    case "pt":
      return import("../messages/pt.json");
    case "ar":
      return import("../messages/ar.json");
    default:
      return Promise.resolve({ default: enData });
  }
}

/**
 * Last-resort boundary when the root layout or other code outside `[locale]` throws.
 * Must define `<html>` / `<body>` because it replaces the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<AppLocale>(routing.defaultLocale);
  const [errors, setErrors] = useState<ErrMessages>(enData.errors);

  useEffect(() => {
    console.error("[PitchRusch global error]", error);
  }, [error]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loc = segmentLocale(window.location.pathname);
    setLocale(loc);
    let cancelled = false;
    void loadLocaleMessages(loc).then((mod) => {
      if (!cancelled) setErrors(mod.default.errors);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rtl = RTL_LOCALES.includes(locale);

  return (
    <html
      lang={locale}
      dir={rtl ? "rtl" : "ltr"}
      style={{ margin: 0, backgroundColor: "#000", colorScheme: "dark" }}
    >
      <head>
        <meta name="color-scheme" content="dark" />
        <style
          dangerouslySetInnerHTML={{
            __html: "html,body{margin:0;background:#000;color-scheme:dark;}",
          }}
        />
      </head>
      <body
        style={{ margin: 0, backgroundColor: "#000" }}
        className="flex min-h-dvh min-w-0 flex-col items-center justify-center gap-4 overflow-x-clip bg-gn-bg px-4 text-center text-gn-text sm:px-6"
      >
        <p className="max-w-md text-lg font-semibold">{errors.globalErrorTitle}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className={GN_PRIMARY_BUTTON_CLASS}>
            {errors.tryAgain}
          </button>
          <Link href={homeHref(locale)} className={GN_SECONDARY_BUTTON_CLASS}>
            {errors.backToHome}
          </Link>
        </div>
      </body>
    </html>
  );
}
