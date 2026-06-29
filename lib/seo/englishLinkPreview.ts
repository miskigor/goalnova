import type { Metadata } from "next";
import { APP_DISPLAY_NAME } from "@/lib/constants/brand";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";
import {
  SITE_SEO_DESCRIPTION,
  SITE_SEO_OG_IMAGE_HEIGHT,
  SITE_SEO_OG_IMAGE_PATH,
  SITE_SEO_OG_IMAGE_WIDTH,
  SITE_SEO_TITLE,
} from "@/lib/seo/brandMetadata";

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
  const imageUrl = absoluteUrl(siteOrigin, SITE_SEO_OG_IMAGE_PATH);

  return {
    openGraph: {
      type: "website",
      siteName: APP_DISPLAY_NAME,
      title: SITE_SEO_TITLE,
      description: SITE_SEO_DESCRIPTION,
      locale: "en_US",
      url: pageUrl,
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          width: SITE_SEO_OG_IMAGE_WIDTH,
          height: SITE_SEO_OG_IMAGE_HEIGHT,
          alt: `${APP_DISPLAY_NAME} — Football talent discovery`,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_SEO_TITLE,
      description: SITE_SEO_DESCRIPTION,
      images: [imageUrl],
    },
  };
}
