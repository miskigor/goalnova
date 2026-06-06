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

export type ScoutShellNavItem = {
  href:
    | "/scout-dashboard"
    | "/scout-apply"
    | "/discover"
    | "/rankings"
    | "/notifications"
    | "/premium"
    | "/profile";
  labelKey:
    | "dashboard"
    | "scoutVerification"
    | "discover"
    | "rankings"
    | "notifications"
    | "profile"
    | "premium"
    | "scoutDashboard";
  icon: NavIconName;
};

/** Desktop sidebar primary list for verified scouts. */
export const APP_SHELL_SCOUT_MAIN_NAV_APPROVED: ScoutShellNavItem[] = [
  { href: "/scout-dashboard", labelKey: "scoutDashboard", icon: "scoutDashboard" },
  { href: "/discover", labelKey: "discover", icon: "discover" },
  { href: "/rankings", labelKey: "rankings", icon: "rankings" },
  { href: "/notifications", labelKey: "notifications", icon: "notifications" },
  { href: "/premium", labelKey: "premium", icon: "premium" },
  { href: "/profile", labelKey: "profile", icon: "profile" },
];

/** Desktop sidebar for scouts pending verification (no player-centric routes). */
export const APP_SHELL_SCOUT_MAIN_NAV_UNVERIFIED: ScoutShellNavItem[] = [
  { href: "/premium", labelKey: "premium", icon: "premium" },
  { href: "/profile", labelKey: "profile", icon: "profile" },
];

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
  href:
    | "/home"
    | "/challenges"
    | "/upload"
    | "/explore"
    | "/premium"
    | "/profile"
    | "/scout-dashboard"
    | "/scout-apply"
    | "/discover"
    | "/rankings"
    | "/messages"
    | "/admin";
  labelKey:
    | "home"
    | "challenges"
    | "upload"
    | "explore"
    | "premium"
    | "profile"
    | "dashboard"
    | "scoutVerification"
    | "discover"
    | "rankings"
    | "messages"
    | "adminPanel"
    | "savedPlayers";
  icon: NavIconName;
  /** Scout mobile: opens dashboard saved tab (`?tab=saved`) instead of plain href. */
  scoutDashboardSection?: "saved";
};

export const APP_SHELL_MOBILE_BOTTOM_NAV: ShellMobileNavItem[] = [
  { href: "/home", labelKey: "home", icon: "home" },
  { href: "/explore", labelKey: "explore", icon: "explore" },
  { href: "/upload", labelKey: "upload", icon: "upload" },
  { href: "/premium", labelKey: "premium", icon: "premium" },
  { href: "/profile", labelKey: "profile", icon: "profile" },
];

/** Mobile bottom nav for verified scouts. */
export const APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV: ShellMobileNavItem[] = [
  { href: "/scout-dashboard", labelKey: "dashboard", icon: "scoutDashboard" },
  { href: "/discover", labelKey: "discover", icon: "discover" },
  { href: "/messages", labelKey: "messages", icon: "messages" },
  {
    href: "/scout-dashboard",
    labelKey: "savedPlayers",
    icon: "scoutDashboard",
    scoutDashboardSection: "saved",
  },
  { href: "/profile", labelKey: "profile", icon: "profile" },
];

/** Mobile bottom nav for scouts pending verification. */
export const APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV_UNVERIFIED: ShellMobileNavItem[] = [
  { href: "/scout-apply", labelKey: "scoutVerification", icon: "scoutDashboard" },
  { href: "/discover", labelKey: "discover", icon: "discover" },
  { href: "/messages", labelKey: "messages", icon: "messages" },
  { href: "/premium", labelKey: "premium", icon: "premium" },
  { href: "/profile", labelKey: "profile", icon: "profile" },
];

/** Mobile bottom nav for staff admins. */
export const APP_SHELL_ADMIN_MOBILE_BOTTOM_NAV: ShellMobileNavItem[] = [
  { href: "/home", labelKey: "home", icon: "home" },
  { href: "/explore", labelKey: "explore", icon: "explore" },
  { href: "/upload", labelKey: "upload", icon: "upload" },
  { href: "/admin", labelKey: "adminPanel", icon: "settings" },
  { href: "/profile", labelKey: "profile", icon: "profile" },
];

/** Player mobile bottom nav — plain links only. */
export const APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV: ShellMobileNavItem[] = [
  { href: "/home", labelKey: "home", icon: "home" },
  { href: "/explore", labelKey: "explore", icon: "explore" },
  { href: "/upload", labelKey: "upload", icon: "upload" },
  { href: "/challenges", labelKey: "challenges", icon: "challenges" },
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
