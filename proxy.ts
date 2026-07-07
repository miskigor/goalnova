import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import {
  LOCALE_COOKIE_MAX_AGE,
  PITCHRUSCH_LOCALE_COOKIE,
  isAppLocale,
  localeFromPathname,
} from "./lib/i18n/localePreference";
import { hrefWithLocale, routing } from "./i18n/routing";
import { VIDEO_ENTRY_COOKIE } from "./lib/video/videoEntryCookie";
import {
  buildMetaCrawlerHtml,
  isMetaLinkPreviewCrawler,
  isPublicLandingPath,
} from "./lib/seo/metaCrawlerHtml";

const handleI18nRouting = createMiddleware(routing);

const VIDEO_FROM_QUERY = new Set(["explore", "rankings", "challenge"]);

/** Reject crawler junk paths like `/$` or `/&` (GSC 404 noise). */
function isMalformedPathname(pathname: string): boolean {
  return /^\/[^a-zA-Z0-9/_-]$/.test(pathname);
}

/** 301 legacy `?from=` video URLs to canonical paths (fewer GSC duplicates). */
function maybeRedirectVideoFromQuery(request: NextRequest): NextResponse | null {
  const from = request.nextUrl.searchParams.get("from");
  if (!from || !VIDEO_FROM_QUERY.has(from)) return null;
  if (!/\/video\/[^/]+$/.test(request.nextUrl.pathname)) return null;

  const url = request.nextUrl.clone();
  url.searchParams.delete("from");
  const response = NextResponse.redirect(url, 301);
  if (from === "explore" || from === "rankings") {
    response.cookies.set(VIDEO_ENTRY_COOKIE, from, {
      path: "/",
      maxAge: 300,
      sameSite: "lax",
    });
  }
  return response;
}

function setLocaleCookie(response: NextResponse, locale: string) {
  response.cookies.set(PITCHRUSCH_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

function runProxy(request: NextRequest): NextResponse {
  const videoFromRedirect = maybeRedirectVideoFromQuery(request);
  if (videoFromRedirect) return videoFromRedirect;

  const { pathname } = request.nextUrl;
  if (isMalformedPathname(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const userAgent = request.headers.get("user-agent");
  if (isMetaLinkPreviewCrawler(userAgent) && isPublicLandingPath(pathname)) {
    const pageUrl = new URL(pathname, request.nextUrl.origin).href.replace(/\/$/, "") || request.nextUrl.origin;
    const html = buildMetaCrawlerHtml(pageUrl, request.nextUrl.origin);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

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

export default function proxy(request: NextRequest) {
  try {
    return runProxy(request);
  } catch (err) {
    console.error("[PitchRusch proxy] unhandled error — falling back to i18n routing", err);
    try {
      const response = handleI18nRouting(request);
      setLocaleCookie(response, routing.defaultLocale);
      return response;
    } catch {
      return NextResponse.next();
    }
  }
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|og/|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
