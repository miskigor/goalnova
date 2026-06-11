import type { Metadata } from "next";

/** Default robots for public marketing/discovery pages. */
export const PUBLIC_INDEX_ROBOTS: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true },
};
