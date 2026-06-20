"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import { useNotificationsInbox } from "@/components/notifications/NotificationsInboxContext";
import { UnreadNotificationBadge } from "@/components/notifications/UnreadNotificationBadge";
import { GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

type Props = {
  fullWidth?: boolean;
  className?: string;
};

export function ProfileMessagesLink({ fullWidth = false, className = "" }: Props) {
  const tNav = useTranslations("nav");
  const t = useTranslations("messages");
  const { unreadCount } = useNotificationsInbox();

  const ariaLabel =
    unreadCount > 0
      ? t("inboxLinkAriaUnread", { count: unreadCount })
      : t("inboxLinkAria");

  const btnClass = fullWidth
    ? `${GN_SECONDARY_BUTTON_CLASS} relative w-full min-h-11 justify-center gap-2 ${className}`
    : `${GN_SECONDARY_BUTTON_CLASS} relative inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold ${className}`;

  return (
    <Link href="/notifications" className={btnClass} aria-label={ariaLabel}>
      <span className="relative inline-flex shrink-0">
        <NavIcon name="messages" className="size-4 shrink-0 opacity-90" />
        <UnreadNotificationBadge count={unreadCount} variant="navSidebar" />
      </span>
      <span className="min-w-0 truncate">{tNav("messages")}</span>
    </Link>
  );
}
