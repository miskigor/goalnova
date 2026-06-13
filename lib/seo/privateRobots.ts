import type { Metadata } from "next";

/**
 * App/auth routes that must not appear in search results.
 * Use page/layout `noindex` (not robots.txt Disallow) so Google can recrawl and drop stale URLs.
 */
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
  "/discover",
  "/premium",
  "/notifications",
  "/settings",
  "/scout-apply",
  "/benefits",
  "/support",
  "/payment/success",
  "/payment/cancel",
  "/role",
] as const;

/** Next.js page metadata for private/auth/app routes. */
export const PRIVATE_PAGE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
};
