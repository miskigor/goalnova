import { routing } from "@/i18n/routing";

const LOCALES = new Set<string>(routing.locales);

/**
 * Prefix like `/de` when the first URL segment is a configured locale (`localePrefix: "as-needed"`).
 * Used where native `<a href>` must match the visible locale (e.g. global error UI without next-intl Link).
 */
export function browserLocalePrefixFromPathname(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg && LOCALES.has(seg)) return `/${seg}`;
  return "";
}
