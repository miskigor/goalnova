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
  | "scoutDashboard";

/** Primary app shell: sidebar (desktop) + bottom bar (mobile). */
export const APP_SHELL_MAIN_NAV = [
  { href: "/home" as const, labelKey: "home" as const, icon: "home" as const },
  { href: "/explore" as const, labelKey: "explore" as const, icon: "explore" as const },
  {
    href: "/rankings" as const,
    labelKey: "rankings" as const,
    icon: "rankings" as const,
  },
  {
    href: "/challenges" as const,
    labelKey: "challenges" as const,
    icon: "challenges" as const,
  },
  {
    href: "/notifications" as const,
    labelKey: "notifications" as const,
    icon: "notifications" as const,
  },
  { href: "/profile" as const, labelKey: "profile" as const, icon: "profile" as const },
  { href: "/premium" as const, labelKey: "premium" as const, icon: "premium" as const },
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
