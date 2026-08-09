"use client";

import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useScoutVerification } from "@/hooks/useScoutVerification";

const rowClass =
  "flex w-full items-center justify-between rounded-xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-3.5 text-left text-xs font-medium text-gn-text transition-colors hover:border-gn-border hover:bg-gn-surface/60 max-lg:px-2 max-lg:py-1.5";

function scrollToInviteFriends(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.getElementById("invite-friends");
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#invite-friends`);
  } catch {
    /* ignore */
  }
  return true;
}

/**
 * Compact links for Profile / Settings (esp. mobile): benefits, invite, support, settings.
 * Keeps bottom nav at 5 items while staying discoverable.
 */
export function AppAccountQuickLinks() {
  const tNav = useTranslations("nav");
  const tInvite = useTranslations("inviteFriends");
  const tSettings = useTranslations("settings");
  const pathname = usePathname();
  const router = useRouter();
  const scoutGate = useScoutVerification();
  const isScoutAccount = scoutGate.loaded && scoutGate.row?.role === "scout";
  const onSettings = pathname === "/settings" || pathname.startsWith("/settings/");

  function onInviteClick(e: MouseEvent<HTMLAnchorElement>) {
    // Same-page hash often no-ops in Instagram / in-app browsers + Next client nav.
    if (onSettings) {
      e.preventDefault();
      if (scrollToInviteFriends()) return;
      // Section still mounting — retry shortly.
      window.setTimeout(() => {
        if (!scrollToInviteFriends()) {
          router.push("/benefits");
        }
      }, 120);
      return;
    }
  }

  return (
    <section
      className="mb-5 min-w-0 max-w-full space-y-2 rounded-xl border border-gn-border-subtle bg-gn-surface/25 p-3 max-lg:p-2"
      aria-label={tNav("quickLinksSection")}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gn-text-tertiary">
        {tNav("quickLinksSection")}
      </p>
      <ul className="space-y-2 max-lg:space-y-1.5">
        <li>
          <Link href="/notifications?tab=activity" className={rowClass}>
            <span>🔔 {tNav("notifications")}</span>
            <span className="text-gn-text-tertiary">→</span>
          </Link>
        </li>
        {!isScoutAccount ? (
          <li>
            <Link href="/benefits" className={rowClass}>
              <span>{tNav("myBenefits")}</span>
              <span className="text-gn-text-tertiary">→</span>
            </Link>
          </li>
        ) : null}
        <li>
          <Link
            href="/settings#invite-friends"
            className={rowClass}
            onClick={onInviteClick}
          >
            <span>{tInvite("inviteFriendsTitle")}</span>
            <span className="text-gn-text-tertiary">→</span>
          </Link>
        </li>
        <li>
          <Link href="/support" className={rowClass}>
            <span>{tSettings("support")}</span>
            <span className="text-gn-text-tertiary">→</span>
          </Link>
        </li>
        {!onSettings ? (
          <li>
            <Link href="/settings" className={rowClass}>
              <span>{tNav("settings")}</span>
              <span className="text-gn-text-tertiary">→</span>
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
