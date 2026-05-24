import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/** Paths that must not be indexed (default locale has no prefix; others use /{locale}/…). */
export const PRIVATE_ROUTE_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/confirm-email",
  "/auth/confirm",
  "/reset-password",
  "/home",
  "/profile",
  "/upload",
  "/messages",
  "/scout-dashboard",
  "/admin",
] as const;

/** Next.js page metadata for private/auth/app routes. */
export const PRIVATE_PAGE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: true,
};

/** `robots.txt` Disallow entries for all locales (prefix match covers nested paths). */
export function privateDisallowPaths(): string[] {
  const paths: string[] = [];
  for (const segment of PRIVATE_ROUTE_PATHS) {
    paths.push(segment);
    for (const locale of routing.locales) {
      if (locale === routing.defaultLocale) continue;
      paths.push(`/${locale}${segment}`);
    }
  }
  return paths;
}
