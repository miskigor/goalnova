import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

/** Map URL / cookie locale to a supported app locale; default English. */
export function normalizeAppLocale(input: string | null | undefined): AppLocale {
  const base = String(input ?? "")
    .trim()
    .toLowerCase()
    .split("-")[0];
  if ((routing.locales as readonly string[]).includes(base)) {
    return base as AppLocale;
  }
  return routing.defaultLocale;
}
