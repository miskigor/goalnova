"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import { APP_SHELL_MAIN_NAV } from "@/lib/constants/navigation";
import { navItemActive } from "@/lib/navigation/navItemActive";
import { useNotificationsInbox } from "@/components/notifications/NotificationsInboxContext";
import { UnreadNotificationBadge } from "@/components/notifications/UnreadNotificationBadge";

function inboxNavActive(pathname: string): boolean {
  return (
    pathname === "/notifications" ||
    pathname.startsWith("/notifications/") ||
    pathname === "/messages" ||
    pathname.startsWith("/messages/")
  );
}

function bottomItemClass(pathname: string, href: string) {
  const active = navItemActive(pathname, href);
  return [
    "group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[9px] font-semibold leading-[1.05] tracking-tight transition-[color,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors sm:text-[10px]",
    active
      ? "text-gn-accent"
      : "text-gn-text-tertiary hover:text-gn-text-secondary motion-safe:hover:scale-105",
  ].join(" ");
}

export function AppMobileBottomNav() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tMessages = useTranslations("messages");
  const { unreadCount } = useNotificationsInbox();
  const items = APP_SHELL_MAIN_NAV.filter((item) => item.href !== "/premium");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex min-w-0 overflow-x-clip border-t border-gn-border-subtle bg-gn-bg/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] pl-[max(0px,env(safe-area-inset-left,0px))] pr-[max(0px,env(safe-area-inset-right,0px))] pt-1 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-gn-bg/90 lg:hidden"
      aria-label={tNav("primary")}
    >
      {items.map((item) => {
        if (item.href === "/notifications") {
          const active = inboxNavActive(pathname);
          const ariaLabel =
            unreadCount > 0
              ? tMessages("inboxLinkAriaUnread", { count: unreadCount })
              : tMessages("inboxLinkAria");
          return (
            <Link
              key={item.href}
              href="/notifications"
              className={bottomItemClass(pathname, item.href)}
              aria-label={ariaLabel}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative inline-flex">
                <NavIcon name="messages" className="size-[22px]" />
                <UnreadNotificationBadge count={unreadCount} variant="navCompact" />
              </span>
              <span className="max-w-full truncate px-0.5 text-center">
                {tNav("messages")}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={bottomItemClass(pathname, item.href)}
            aria-current={
              navItemActive(pathname, item.href) ? "page" : undefined
            }
          >
            <NavIcon
              name={item.icon}
              className="size-[22px] shrink-0 transition-transform duration-300 ease-gn-smooth motion-safe:group-hover:scale-110"
            />
            <span className="max-w-full truncate px-0.5 text-center">
              {tNav(item.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
