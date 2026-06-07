import { hrefWithLocale } from "@/i18n/routing";

/** Full-page navigation after auth — avoids stuck client-side gate spinners on mobile. */
export function navigateAfterAuth(pathname: string, locale: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(hrefWithLocale(pathname, locale));
}
