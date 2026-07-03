import type { Metadata } from "next";
import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";
import {
  SITE_SEO_OG_IMAGE_HEIGHT,
  SITE_SEO_OG_IMAGE_MIME,
  SITE_SEO_OG_IMAGE_WIDTH,
  SITE_SEO_OG_SHARE_DESCRIPTION,
  SITE_SEO_OG_SHARE_TITLE,
} from "@/lib/seo/brandMetadata";
import {
  SITE_OG_IMAGE_CACHE_VERSION,
  siteOgImageAbsoluteUrl,
} from "@/lib/seo/metaCrawlerHtml";

const DEFAULT_SITE_ORIGIN = "https://pitchrusch.com";

function normalizeOrigin(origin: string | null | undefined): string {
  const raw = (origin ?? getServerSiteOrigin() ?? DEFAULT_SITE_ORIGIN).trim();
  return raw.replace(/\/$/, "") || DEFAULT_SITE_ORIGIN;
}

function absoluteUrl(origin: string, pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}

export type BrandLinkPreviewOptions = {
  /** Canonical path only, e.g. `/` or `/hr`. */
  canonicalPath: string;
  origin?: string | null;
};

/**
 * English-only Open Graph + Twitter metadata for social link previews.
 * Never uses next-intl — same on /hr, /de, and all locales.
 */
export function buildBrandLinkPreviewMetadata({
  canonicalPath,
  origin,
}: BrandLinkPreviewOptions): Pick<Metadata, "openGraph" | "twitter"> {
  const siteOrigin = normalizeOrigin(origin);
  const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  const pageUrl = absoluteUrl(siteOrigin, path);
  const imageUrl = siteOgImageAbsoluteUrl(siteOrigin);

  return {
    openGraph: {
      type: "website",
      siteName: APP_DISPLAY_NAME,
      title: SITE_SEO_OG_SHARE_TITLE,
      description: SITE_SEO_OG_SHARE_DESCRIPTION,
      locale: "en_US",
      url: pageUrl,
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          width: SITE_SEO_OG_IMAGE_WIDTH,
          height: SITE_SEO_OG_IMAGE_HEIGHT,
          alt: `${APP_DISPLAY_NAME} - Football talent discovery`,
          type: SITE_SEO_OG_IMAGE_MIME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_SEO_OG_SHARE_TITLE,
      description: SITE_SEO_OG_SHARE_DESCRIPTION,
      images: [imageUrl],
    },
  };
}

/** @deprecated Use siteOgImageAbsoluteUrl from metaCrawlerHtml */
export function brandOgImageAbsoluteUrl(origin?: string | null): string {
  return siteOgImageAbsoluteUrl(normalizeOrigin(origin));
}

export { SITE_OG_IMAGE_CACHE_VERSION };
