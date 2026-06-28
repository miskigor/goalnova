/**
 * Whether `pathname` should treat `href` as the active primary nav target.
 * Used by sidebar and mobile bottom nav (locale prefix is stripped by usePathname from i18n).
 */
export function navItemActive(pathname: string, href: string): boolean {
  if (href === "/home") return pathname === "/home";
  if (href === "/explore") return pathname === "/explore";
  if (href === "/clubs")
    return pathname === "/clubs" || pathname.startsWith("/clubs/");
  if (href === "/rankings") return pathname === "/rankings";
  if (href === "/premium") return pathname === "/premium";
  if (href === "/benefits") return pathname === "/benefits" || pathname.startsWith("/benefits/");
  if (href === "/challenges")
    return pathname === "/challenges" || pathname.startsWith("/challenges/");
  if (href === "/notifications")
    return (
      pathname === "/notifications" ||
      pathname.startsWith("/notifications/") ||
      pathname === "/messages" ||
      pathname.startsWith("/messages/")
    );
  if (href === "/profile")
    return pathname === "/profile" || pathname.startsWith("/profile/");
  if (href === "/messages")
    return pathname === "/messages" || pathname.startsWith("/messages/");
  if (href === "/discover")
    return pathname === "/discover" || pathname.startsWith("/discover/");
  if (href === "/scout-dashboard")
    return (
      pathname === "/scout-dashboard" || pathname.startsWith("/scout-dashboard/")
    );
  if (href === "/scout-apply")
    return pathname === "/scout-apply" || pathname.startsWith("/scout-apply/");
  if (href === "/upload")
    return pathname === "/upload" || pathname.startsWith("/upload/");
  if (href === "/settings")
    return pathname === "/settings" || pathname.startsWith("/settings/");
  if (href === "/admin")
    return pathname === "/admin" || pathname.startsWith("/admin/");
  if (href === "/login") return pathname === "/login";
  if (href === "/signup") return pathname === "/signup";
  return false;
}
