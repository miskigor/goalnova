import type { ShellMobileNavItem } from "@/lib/constants/navigation";

/** Player mobile bottom bar — three swipe pages (4 tabs each). */
export const APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV_PAGES: ShellMobileNavItem[][] = [
  [
    { href: "/home", labelKey: "home", icon: "home" },
    { href: "/profile", labelKey: "profile", icon: "profile" },
    { href: "/upload", labelKey: "upload", icon: "upload" },
    { href: "/challenges", labelKey: "challenges", icon: "challenges" },
  ],
  [
    { href: "/explore", labelKey: "explore", icon: "explore" },
    { href: "/messages", labelKey: "messages", icon: "messages" },
    { href: "/rankings", labelKey: "rankings", icon: "rankings" },
    { href: "/clubs", labelKey: "clubs", icon: "clubs" },
  ],
  [
    { href: "/premium", labelKey: "premium", icon: "premium" },
    { href: "/benefits", labelKey: "myBenefits", icon: "benefits" },
    { href: "/support", labelKey: "support", icon: "support" },
    { href: "/settings", labelKey: "settings", icon: "settings" },
  ],
];

const PAGE_MATCHERS: Array<(pathname: string) => boolean> = [
  (pathname) =>
    pathname === "/home" ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/upload" ||
    pathname.startsWith("/upload/") ||
    pathname === "/challenges" ||
    pathname.startsWith("/challenges/"),
  (pathname) =>
    pathname === "/explore" ||
    pathname === "/messages" ||
    pathname.startsWith("/messages/") ||
    pathname === "/rankings" ||
    pathname === "/clubs" ||
    pathname.startsWith("/clubs/"),
  (pathname) =>
    pathname === "/premium" ||
    pathname === "/benefits" ||
    pathname.startsWith("/benefits/") ||
    pathname === "/support" ||
    pathname.startsWith("/support/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/"),
];

/** Which carousel page should be visible for the current route (0–2). */
export function playerBottomNavPageIndex(pathname: string): number {
  const idx = PAGE_MATCHERS.findIndex((match) => match(pathname));
  return idx >= 0 ? idx : 0;
}
