import { getLocale } from "next-intl/server";
import { RTL_LOCALES, routing, type AppLocale } from "@/i18n/routing";
import { normalizeAppLocale } from "@/lib/i18n/normalizeAppLocale";

/** `<html lang>` / `dir` for the root layout — from next-intl request locale (middleware header). */
export async function documentHtmlLocale(): Promise<{
  lang: AppLocale;
  dir: "ltr" | "rtl";
}> {
  let lang: AppLocale = routing.defaultLocale;
  try {
    lang = normalizeAppLocale(await getLocale());
  } catch {
    lang = routing.defaultLocale;
  }
  return {
    lang,
    dir: RTL_LOCALES.includes(lang) ? "rtl" : "ltr",
  };
}
