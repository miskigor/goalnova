/** Product name (browser tab template, OpenGraph `siteName`, installable app label). */
export const APP_DISPLAY_NAME = "PitchRusch";

/**
 * Main PitchRusch logo in `public/` (`logo.png` — full mark with icon + wordmark).
 * Change `BRAND_LOGO_SRC` to swap asset. Supported: SVG, PNG, WebP.
 */
export const BRAND_LOGO_SRC = "/logo.png";

/** Intrinsic dimensions of the PNG (must match the file; used by `next/image`). */
export const BRAND_LOGO_WIDTH = 1024;
export const BRAND_LOGO_HEIGHT = 1024;

/** Landscape share image — Twitter / Open Graph large cards (~1.91:1). */
export const BRAND_OG_IMAGE_SRC = "/og-image.jpg";
export const BRAND_OG_IMAGE_WIDTH = 1200;
export const BRAND_OG_IMAGE_HEIGHT = 630;
/** Square share card — WhatsApp / iMessage thumbnails prefer 1:1. */
export const BRAND_OG_IMAGE_SQUARE_SRC = "/og-image-square.jpg";
export const BRAND_OG_IMAGE_SQUARE_SIZE = 1200;
export const BRAND_OG_IMAGE_MIME = "image/jpeg";

/** Official profiles for Organization.sameAs. LinkedIn omitted until a company page exists. */
export const ORGANIZATION_SAME_AS = [
  "https://www.instagram.com/pitchrusch/",
  "https://www.tiktok.com/@pitchrusch",
] as const;
