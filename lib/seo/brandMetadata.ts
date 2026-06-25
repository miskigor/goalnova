/** English brand copy — link previews (OG/Twitter) always use these, every locale URL. */
export const SITE_SEO_TITLE = "PitchRusch | Football Talent Discovery Platform";

/** Meta description + OG/Twitter description (English only for share cards). */
export const SITE_SEO_DESCRIPTION =
  "Upload football highlights, join weekly skill challenges, and get discovered by scouts and clubs on PitchRusch.";

export const SITE_SEO_KEYWORDS = [
  "PitchRusch",
  "pitchrusch",
  "football talent discovery",
  "football scouting app",
  "football highlights platform",
  "youth football talent",
  "soccer recruiting",
  "football challenges",
] as const;

import { BRAND_LOGO_SRC } from "@/lib/constants/brand";

/** Static brand logo for social link previews (WhatsApp, Instagram, TikTok). */
export const SITE_SEO_OG_IMAGE_PATH = BRAND_LOGO_SRC;

/** Short line for generated OG / Twitter card images. */
export const SITE_SEO_OG_TAGLINE =
  "Show your skills. Join challenges. Get discovered.";
