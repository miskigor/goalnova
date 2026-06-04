import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import {
  LOCALE_COOKIE_MAX_AGE,
  PITCHRUSCH_LOCALE_COOKIE,
  isAppLocale,
  localeFromPathname,
} from "./lib/i18n/localePreference";
import { hrefWithLocale, routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

function setLocaleCookie(response: NextResponse, locale: string) {
  response.cookies.set(PITCHRUSCH_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const urlLocale = localeFromPathname(pathname);
  const cookieRaw = request.cookies.get(PITCHRUSCH_LOCALE_COOKIE)?.value;
  const preferred = isAppLocale(cookieRaw) ? cookieRaw : null;

  if (!urlLocale && preferred && preferred !== routing.defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = hrefWithLocale(pathname, preferred);
    const redirect = NextResponse.redirect(url);
    setLocaleCookie(redirect, preferred);
    return redirect;
  }

  const response = handleI18nRouting(request);
  const localeToStore = urlLocale ?? preferred ?? routing.defaultLocale;
  setLocaleCookie(response, localeToStore);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|opengraph-image|twitter-image|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
