"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import { useNotificationsInbox } from "@/components/notifications/NotificationsInboxContext";
import { UnreadNotificationBadge } from "@/components/notifications/UnreadNotificationBadge";

type HeaderNotificationsLinkProps = {
  /** When set, overrides pathname-based detection (e.g. rare layouts). */
  active?: boolean;
  /** Inline header row, mobile drawer row, or desktop sidebar row */
  layout?: "header" | "sheet" | "sidebar";
  onNavigate?: () => void;
};

function inboxNavActive(pathname: string): boolean {
  return (
    pathname === "/notifications" ||
    pathname.startsWith("/notifications/") ||
    pathname === "/messages" ||
    pathname.startsWith("/messages/")
  );
}

export function HeaderNotificationsLink(
  props: HeaderNotificationsLinkProps = {},
) {
  const { active: activeOverride, layout = "header", onNavigate } = props;
  const pathname = usePathname();
  const t = useTranslations("messages");
  const tNav = useTranslations("nav");
  const { unreadCount } = useNotificationsInbox();

  const derivedActive = inboxNavActive(pathname);
  const active =
    activeOverride === undefined ? derivedActive : activeOverride;

  const ariaLabel =
    unreadCount > 0
      ? t("inboxLinkAriaUnread", { count: unreadCount })
      : t("inboxLinkAria");

  const iconClass =
    layout === "header"
      ? "size-5 shrink-0"
      : layout === "sheet"
        ? "size-6 shrink-0"
        : "size-5 shrink-0";

  if (layout === "sheet") {
    return (
      <Link
        href="/notifications"
        className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-200 ${
          active
            ? "bg-white/[0.08] font-semibold text-gn-accent"
            : "text-gn-text hover:bg-white/[0.05] hover:text-gn-text-secondary"
        }`}
        aria-label={ariaLabel}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
      >
        <span className="relative inline-flex shrink-0">
          <NavIcon name="messages" className={iconClass} />
          <UnreadNotificationBadge count={unreadCount} variant="navSidebar" />
        </span>
        <span className="min-w-0 flex-1 text-base font-medium">
          {tNav("messages")}
        </span>
      </Link>
    );
  }

  if (layout === "sidebar") {
    return (
      <Link
        href="/notifications"
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          active
            ? "bg-gn-accent/15 text-gn-accent ring-1 ring-gn-accent/35"
            : "text-gn-text-secondary hover:bg-white/[0.05] hover:text-gn-text"
        }`}
        aria-label={ariaLabel}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
      >
        <span className="relative inline-flex size-5 shrink-0">
          <NavIcon name="messages" className={iconClass} />
          <UnreadNotificationBadge count={unreadCount} variant="navSidebar" />
        </span>
        <span className="min-w-0 flex-1 truncate">{tNav("messages")}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/notifications"
      className={`relative flex shrink-0 items-center gap-1.5 rounded-lg py-2 pe-2 ps-2 transition-all duration-200 sm:px-3 ${
        active
          ? "bg-white/[0.08] font-semibold text-gn-accent"
          : "text-gn-text-secondary hover:bg-white/[0.05] hover:text-gn-text"
      }`}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
    >
      <span className="relative inline-flex shrink-0">
        <NavIcon name="messages" className={iconClass} />
        <UnreadNotificationBadge count={unreadCount} variant="header" />
      </span>
      <span className="hidden max-w-[7.5rem] truncate text-sm font-medium lg:inline">
        {tNav("messages")}
      </span>
    </Link>
  );
}
