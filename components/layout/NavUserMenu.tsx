"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { devError } from "@/lib/devLog";
import { signOut } from "@/lib/supabase/auth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { UnreadNotificationBadge } from "@/components/notifications/UnreadNotificationBadge";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";
import { NAV_MENU_PLAYER_UPLOAD_CLASS } from "@/components/layout/sidebarUploadStyles";
import { NavIcon } from "@/components/icons/NavIcons";
import { navItemActive } from "@/lib/navigation/navItemActive";
import { useAppFeedback } from "@/components/feedback/FeedbackProvider";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import {
  AVATAR_URL_UPDATED_EVENT,
  type AvatarUrlUpdatedDetail,
} from "@/lib/avatar/avatarClientEvents";
import { supabase } from "@/lib/supabase/client";
import { fetchAdminUnreadSupportCount } from "@/lib/supabase/adminSystem";
import { countMyUnreadSupportReplies } from "@/lib/supabase/supportTickets";

function displayNameFromUser(user: User): string {
  return (
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0]?.trim() ||
    "?"
  );
}

type NavUserMenuProps = {
  user: User;
  /** Close parent mobile drawer when a route is chosen */
  onNavigate?: () => void;
  /** Open dropdown above the trigger (e.g. sidebar footer) */
  menuPlacement?: "below" | "above";
};

export function NavUserMenu({
  user,
  onNavigate,
  menuPlacement = "below",
}: NavUserMenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const tNav = useTranslations("nav");
  const tSettings = useTranslations("settings");
  const tAuth = useTranslations("authCommon");
  const tErr = useTranslations("errors");
  const tA11y = useTranslations("a11y");
  const pathname = usePathname();
  const uploadEligibility = useVideoUploadEligibility();
  const { loaded: adminLoaded, isAdmin } = useAdminAccess();
  const [adminSupportUnread, setAdminSupportUnread] = useState(0);
  const [userSupportUnread, setUserSupportUnread] = useState(0);
  const supportUnreadChannelRef = useRef(
    `admin-support-unread-user-menu-${Math.random().toString(36).slice(2)}`,
  );
  const userSupportUnreadChannelRef = useRef(
    `user-support-unread-menu-${Math.random().toString(36).slice(2)}`,
  );
  const { showError } = useAppFeedback();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const uid = user.id;
    if (!uid) {
      setAvatarUrl(null);
      return;
    }
    void supabase
      .from("users")
      .select("avatar_url")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const u = typeof data?.avatar_url === "string" ? data.avatar_url.trim() : "";
        setAvatarUrl(u || null);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id, pathname]);

  useEffect(() => {
    if (!adminLoaded || !isAdmin) {
      setAdminSupportUnread(0);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const { count } = await fetchAdminUnreadSupportCount();
      if (!cancelled) setAdminSupportUnread(count);
    };
    void refresh();
    const ch = supabase
      .channel(supportUnreadChannelRef.current)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_ticket_messages" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [adminLoaded, isAdmin]);

  useEffect(() => {
    if (!user?.id || isAdmin) {
      setUserSupportUnread(0);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const { count } = await countMyUnreadSupportReplies();
      if (!cancelled) setUserSupportUnread(count);
    };
    void refresh();
    const ch = supabase
      .channel(userSupportUnreadChannelRef.current)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_ticket_messages" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [user?.id, isAdmin]);

  useEffect(() => {
    function onAvatarUpdated(ev: Event) {
      const e = ev as CustomEvent<AvatarUrlUpdatedDetail>;
      const next = e.detail?.url;
      setAvatarUrl(
        next === undefined || next === null
          ? null
          : (typeof next === "string" ? next.trim() : "") || null,
      );
    }
    window.addEventListener(AVATAR_URL_UPDATED_EVENT, onAvatarUpdated);
    return () => window.removeEventListener(AVATAR_URL_UPDATED_EVENT, onAvatarUpdated);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onLogout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await signOut();
      setOpen(false);
      onNavigate?.();
      router.replace("/login");
    } catch (e) {
      devError("Nav logout error:", e);
      showError(tErr("generic"));
    } finally {
      setLogoutBusy(false);
    }
  }

  const linkClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gn-text-secondary transition-colors duration-200 hover:bg-gn-surface-elevated hover:text-gn-text";

  const showUploadInMenu =
    uploadEligibility !== "non_player" && uploadEligibility !== "signed_out";
  const uploadMenuPrimary = uploadEligibility === "player";
  const uploadPathActive = navItemActive(pathname, "/upload");

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-label={tA11y("accountMenu")}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-0.5 transition-all duration-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg"
      >
        <ProfileAvatar
          name={displayNameFromUser(user)}
          imageUrl={avatarUrl}
          sizeClassName="size-9 text-xs font-semibold"
          className="ring-2 ring-gn-border-subtle"
        />
        <svg
          className={`size-4 shrink-0 text-gn-text-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute end-0 z-[120] min-w-[13.5rem] rounded-xl border border-gn-border-subtle bg-gn-surface-elevated/95 py-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-opacity duration-200 ${
            menuPlacement === "above"
              ? "bottom-[calc(100%+0.5rem)]"
              : "top-[calc(100%+0.5rem)]"
          }`}
        >
          {uploadMenuPrimary ? (
            <Link
              href="/upload"
              role="menuitem"
              className={`${NAV_MENU_PLAYER_UPLOAD_CLASS} ${uploadPathActive ? "bg-gn-accent/18 ring-1 ring-inset ring-gn-accent/45" : ""}`.trim()}
              aria-current={uploadPathActive ? "page" : undefined}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              <NavIcon name="upload" className="size-4 shrink-0 opacity-90" />
              {tNav("upload")}
            </Link>
          ) : null}

          <Link
            href="/profile"
            role="menuitem"
            className={linkClass}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            {tNav("profile")}
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            className={linkClass}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            {tNav("settings")}
          </Link>
          <Link
            href="/support"
            role="menuitem"
            className={linkClass}
            aria-label={
              userSupportUnread > 0
                ? `${tSettings("support")}, ${userSupportUnread} unread`
                : tSettings("support")
            }
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            <span className="relative inline-flex shrink-0">
              <NavIcon name="settings" className="size-4 shrink-0 opacity-90" />
              <UnreadNotificationBadge
                count={isAdmin ? 0 : userSupportUnread}
                variant="navSidebar"
              />
            </span>
            {tSettings("support")}
          </Link>

          {adminLoaded && isAdmin ? (
            <Link
              href="/admin"
              role="menuitem"
              className={linkClass}
              aria-label={
                adminSupportUnread > 0
                  ? `${tNav("adminPanel")}, ${adminSupportUnread} unread`
                  : tNav("adminPanel")
              }
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              <span className="relative inline-flex shrink-0">
                <NavIcon name="settings" className="size-4 shrink-0 opacity-90" />
                <UnreadNotificationBadge count={adminSupportUnread} variant="navSidebar" />
              </span>
              {tNav("adminPanel")}
            </Link>
          ) : null}

          {showUploadInMenu && !uploadMenuPrimary ? (
            <Link
              href="/upload"
              role="menuitem"
              className={linkClass}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              {tNav("upload")}
            </Link>
          ) : null}

          <div className="my-1 h-px bg-gn-border-subtle" role="separator" />
          <button
            type="button"
            role="menuitem"
            disabled={logoutBusy}
            aria-busy={logoutBusy}
            className={`${linkClass} text-gn-text-secondary hover:text-gn-text disabled:pointer-events-none disabled:opacity-50`}
            onClick={() => void onLogout()}
          >
            {logoutBusy ? tAuth("loading") : tAuth("logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
