import type { Metadata } from "next";
import { buildLocaleAlternates, localizedCanonicalPath } from "@/lib/seo/alternates";
import { buildBrandLinkPreviewMetadata } from "@/lib/seo/englishLinkPreview";
import { getServerSiteOrigin, siteMetadataBase } from "@/lib/site/serverSiteOrigin";

type PublicPageMetadataOptions = {
  locale: string;
  /** Path without locale prefix, e.g. `/explore`. */
  pathname: string;
  title: string;
  description: string;
  index?: boolean;
};

/** Localized title, description, canonical, hreflang, and English OG/Twitter cards. */
export function buildPublicPageMetadata({
  locale,
  pathname,
  title,
  description,
  index = true,
}: PublicPageMetadataOptions): Metadata {
  const origin = getServerSiteOrigin();
  const metadataBase = siteMetadataBase(origin);
  const canonicalPath = localizedCanonicalPath(locale, pathname);
  const linkPreview = buildBrandLinkPreviewMetadata({ canonicalPath, origin });

  return {
    metadataBase,
    title,
    description,
    alternates: {
      ...buildLocaleAlternates(pathname),
      canonical: canonicalPath,
    },
    robots: index
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: true },
    openGraph: {
      ...linkPreview.openGraph,
      title,
      description,
      url: canonicalPath,
    },
    twitter: {
      ...linkPreview.twitter,
      title,
      description,
    },
  };
}
