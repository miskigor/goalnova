export type NavIconName =
  | "home"
  | "explore"
  | "rankings"
  | "discover"
  | "notifications"
  | "messages"
  | "profile"
  | "settings"
  | "upload"
  | "challenges"
  | "premium"
  | "scoutDashboard"
  | "benefits";

export type AppShellNavItem = {
  href:
    | "/home"
    | "/explore"
    | "/rankings"
    | "/challenges"
    | "/notifications"
    | "/profile"
    | "/premium"
    | "/benefits";
  labelKey:
    | "home"
    | "explore"
    | "rankings"
    | "challenges"
    | "notifications"
    | "profile"
    | "premium"
    | "myBenefits";
  icon: NavIconName;
};

/**
 * Desktop sidebar primary list (order preserved).
 * Mobile bottom bar uses {@link APP_SHELL_MOBILE_BOTTOM_NAV} only (max 5 items).
 */
export const APP_SHELL_MAIN_NAV: AppShellNavItem[] = [
  { href: "/home", labelKey: "home", icon: "home" },
  { href: "/explore", labelKey: "explore", icon: "explore" },
  { href: "/rankings", labelKey: "rankings", icon: "rankings" },
  { href: "/challenges", labelKey: "challenges", icon: "challenges" },
  { href: "/notifications", labelKey: "notifications", icon: "notifications" },
  { href: "/profile", labelKey: "profile", icon: "profile" },
  { href: "/premium", labelKey: "premium", icon: "premium" },
  { href: "/benefits", labelKey: "myBenefits", icon: "benefits" },
];

/** Mobile bottom navigation: exactly five primary destinations (no overflow on small phones). */
export type ShellMobileNavItem = {
  href: "/home" | "/challenges" | "/upload" | "/explore" | "/premium" | "/profile";
  labelKey: "home" | "challenges" | "upload" | "explore" | "premium" | "profile";
  icon: NavIconName;
};

export const APP_SHELL_MOBILE_BOTTOM_NAV: ShellMobileNavItem[] = [
  { href: "/home", labelKey: "home", icon: "home" },
  { href: "/challenges", labelKey: "challenges", icon: "challenges" },
  { href: "/upload", labelKey: "upload", icon: "upload" },
  { href: "/premium", labelKey: "premium", icon: "premium" },
  { href: "/profile", labelKey: "profile", icon: "profile" },
];

export type AppNavItem = {
  href:
    | "/home"
    | "/explore"
    | "/discover"
    | "/notifications"
    | "/profile"
    | "/upload"
    | "/settings";
  labelKey:
    | "home"
    | "explore"
    | "discover"
    | "notifications"
    | "messages"
    | "profile"
    | "upload"
    | "settings";
  icon: NavIconName;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/home", labelKey: "home", icon: "home" },
  { href: "/explore", labelKey: "explore", icon: "explore" },
  { href: "/discover", labelKey: "discover", icon: "discover" },
  { href: "/notifications", labelKey: "messages", icon: "messages" },
  { href: "/profile", labelKey: "profile", icon: "profile" },
  { href: "/upload", labelKey: "upload", icon: "upload" },
  { href: "/settings", labelKey: "settings", icon: "settings" },
];
