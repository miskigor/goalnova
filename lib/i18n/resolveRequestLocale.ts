import { routing, type AppLocale } from "@/i18n/routing";
import { isAppLocale, PITCHRUSCH_LOCALE_COOKIE } from "@/lib/i18n/localePreference";

export function resolveAppLocale(...candidates: unknown[]): AppLocale {
  for (const value of candidates) {
    if (typeof value === "string" && isAppLocale(value)) return value;
  }
  return routing.defaultLocale;
}

export function localeFromCookieHeader(cookieHeader: string | null): AppLocale | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${PITCHRUSCH_LOCALE_COOKIE}=([^;]+)`),
  );
  if (!match?.[1]) return null;
  try {
    return resolveAppLocale(decodeURIComponent(match[1].trim()));
  } catch {
    return null;
  }
}

export function localeFromRequest(request: Request, bodyLocale?: unknown): AppLocale {
  return resolveAppLocale(
    bodyLocale,
    localeFromCookieHeader(request.headers.get("cookie")),
  );
}
