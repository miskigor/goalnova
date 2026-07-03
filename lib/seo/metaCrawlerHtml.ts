import { isAppLocale } from "@/lib/i18n/localePreference";
import {
  SITE_SEO_OG_IMAGE_PATH,
  SITE_SEO_OG_SHARE_DESCRIPTION,
  SITE_SEO_OG_SHARE_TITLE,
} from "@/lib/seo/brandMetadata";

/** Bump when replacing og-image assets to bust Meta/WhatsApp/Instagram cache. */
export const SITE_OG_IMAGE_CACHE_VERSION = "4";

const DEFAULT_ORIGIN = "https://pitchrusch.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isMetaLinkPreviewCrawler(userAgent: string | null): boolean {
  const ua = (userAgent ?? "").toLowerCase();
  return (
    ua.includes("facebookexternalhit") ||
    ua.includes("facebot") ||
    ua.includes("whatsapp") ||
    ua.includes("instagram") ||
    ua.includes("meta-externalagent") ||
    ua.includes("meta-webindexer")
  );
}

/** Public marketing landing only — `/` or `/{locale}`. */
export function isPublicLandingPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return true;
  const segment = path.split("/").filter(Boolean)[0];
  return segment != null && segment.length > 0 && isAppLocale(segment) && path.split("/").filter(Boolean).length === 1;
}

export function siteOgImageAbsoluteUrl(origin: string): string {
  const base = (origin || DEFAULT_ORIGIN).replace(/\/$/, "");
  const path = SITE_SEO_OG_IMAGE_PATH.startsWith("/")
    ? SITE_SEO_OG_IMAGE_PATH
    : `/${SITE_SEO_OG_IMAGE_PATH}`;
  return `${base}${path}?v=${SITE_OG_IMAGE_CACHE_VERSION}`;
}

export function buildMetaCrawlerHtml(pageUrl: string, origin: string): string {
  const title = escapeHtml(SITE_SEO_OG_SHARE_TITLE);
  const description = escapeHtml(SITE_SEO_OG_SHARE_DESCRIPTION);
  const image = escapeHtml(siteOgImageAbsoluteUrl(origin));
  const url = escapeHtml(pageUrl.replace(/\/$/, "") || DEFAULT_ORIGIN);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="${url}"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${description}"/>
<meta property="og:image" content="${image}"/>
<meta property="og:image:secure_url" content="${image}"/>
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:site_name" content="PitchRusch"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${description}"/>
<meta name="twitter:image" content="${image}"/>
<title>${title}</title>
</head>
<body><p>${title}</p></body>
</html>`;
}
