import type { Metadata } from "next";

/** Google Search Console HTML-tag verification (server env only). */
export function buildSiteVerificationMetadata(): Pick<Metadata, "verification"> {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  if (!google) return {};
  return { verification: { google } };
}
