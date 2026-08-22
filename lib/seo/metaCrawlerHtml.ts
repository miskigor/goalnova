import { isAppLocale } from "@/lib/i18n/localePreference";
import {
  SITE_SEO_OG_IMAGE_PATH,
  SITE_SEO_OG_IMAGE_SQUARE_PATH,
  SITE_SEO_OG_SHARE_DESCRIPTION,
  SITE_SEO_OG_SHARE_TITLE,
} from "@/lib/seo/brandMetadata";

const DEFAULT_ORIGIN = "https://pitchrusch.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Meta link-preview bots only — NOT Instagram/WhatsApp in-app browsers
 * (those UAs also contain "Instagram" / "WhatsApp" but include Mozilla/WebKit).
 */
export function isMetaLinkPreviewCrawler(userAgent: string | null): boolean {
  const ua = (userAgent ?? "").trim();
  if (!ua) return false;
  const lower = ua.toLowerCase();

  if (lower.includes("facebookexternalhit")) return true;
  if (lower.includes("facebot")) return true;
  if (lower.includes("meta-externalagent")) return true;
  if (lower.includes("meta-externalfetcher")) return true;
  if (lower.includes("meta-webindexer")) return true;

  // WhatsApp preview bot — "WhatsApp/2.x" without a normal browser prefix.
  if (/^whatsapp\/[\d.]+/i.test(ua) && !lower.includes("mozilla")) return true;

  return false;
}

/** Public marketing landing only — `/` or `/{locale}`. */
export function isPublicLandingPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return true;
  const segment = path.split("/").filter(Boolean)[0];
  return (
    segment != null &&
    segment.length > 0 &&
    isAppLocale(segment) &&
    path.split("/").filter(Boolean).length === 1
  );
}

function absoluteAssetUrl(origin: string, assetPath: string): string {
  const base = (origin || DEFAULT_ORIGIN).replace(/\/$/, "");
  const path = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return `${base}${path}`;
}

/** Landscape OG / Twitter large-card image (~1.91:1). */
export function siteOgImageAbsoluteUrl(origin: string): string {
  return absoluteAssetUrl(origin, SITE_SEO_OG_IMAGE_PATH);
}

/** Square image for WhatsApp / iMessage preview bots. */
export function siteOgSquareImageAbsoluteUrl(origin: string): string {
  return absoluteAssetUrl(origin, SITE_SEO_OG_IMAGE_SQUARE_PATH);
}

export function buildMetaCrawlerHtml(pageUrl: string, origin: string): string {
  const title = escapeHtml(SITE_SEO_OG_SHARE_TITLE);
  const description = escapeHtml(SITE_SEO_OG_SHARE_DESCRIPTION);
  const image = escapeHtml(siteOgSquareImageAbsoluteUrl(origin));
  const url = escapeHtml(pageUrl.replace(/\/$/, "") || DEFAULT_ORIGIN);

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
<meta property="og:image" content="${image}"/>
<meta property="og:image:secure_url" content="${image}"/>
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="1200"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${description}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="PitchRusch"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${image}"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${description}"/>
<meta name="thumbnail" content="${image}"/>
<link rel="image_src" href="${image}"/>
<meta charset="utf-8"/>
<title>${title}</title>
</head>
<body>
<a href="${url}"><img src="${image}" width="1200" height="1200" alt="PitchRusch"/></a>
<p>${title}</p>
</body>
</html>`;
}
