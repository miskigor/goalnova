"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { devError, isDev } from "@/lib/devLog";
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
import { useAdminSupportUnread } from "@/components/layout/AdminSupportUnreadContext";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { countMyUnreadSupportReplies } from "@/lib/supabase/supportTickets";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { logAppShellPageOverflowOffenders } from "@/lib/layout/detectHorizontalOverflow";
import {
  APP_MOBILE_BOTTOM_NAV_PROFILE_AVATAR_CLASS,
  APP_MOBILE_BOTTOM_NAV_PROFILE_TRIGGER_CLASS,
} from "@/lib/layout/appShellClasses";

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
  /** Mobile app header: former hamburger links + language (no duplicate hamburger). */
  mobileMoreInMenu?: boolean;
  /** Mobile header: avatar-only trigger without chevron to save horizontal space. */
  compactTrigger?: boolean;
  /** Mobile bottom nav: menu opens above tab bar with premium/benefits overflow. */
  bottomNavTrigger?: boolean;
};

function newRealtimeChannelSuffix(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `rt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const ACCOUNT_MENU_PANEL_BASE_CLASS =
  "box-border overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-xl border border-gn-border-subtle bg-gn-surface-elevated/95 py-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl";

/** Mobile header account menu: fixed inside viewport (portal), never wider than screen. */
const ACCOUNT_MENU_PANEL_MOBILE_CLASS = [
  ACCOUNT_MENU_PANEL_BASE_CLASS,
  "fixed z-[120] w-[min(20rem,calc(100%-2rem))] max-w-[calc(100%-2rem)]",
  "end-4 start-auto",
  "top-[calc(var(--gn-app-header-offset,3.5rem)+0.5rem)]",
  "max-h-[min(calc(100dvh-var(--gn-app-header-offset,3.5rem)-var(--gn-app-bottom-nav-offset,4.25rem)-1rem),32rem)]",
].join(" ");

/** Mobile bottom nav profile menu — anchored above the tab bar. */
const ACCOUNT_MENU_PANEL_BOTTOM_NAV_CLASS = [
  ACCOUNT_MENU_PANEL_BASE_CLASS,
  "fixed z-[1201] w-[min(20rem,calc(100%-2rem))] max-w-[calc(100%-2rem)]",
  "end-4 start-auto",
  "bottom-[calc(var(--gn-app-bottom-nav-offset,4.5rem)+var(--gn-mobile-visual-bottom-inset,0px)+0.5rem)]",
  "max-h-[min(calc(100dvh-var(--gn-app-bottom-nav-offset,4.5rem)-var(--gn-mobile-visual-bottom-inset,0px)-1.5rem),28rem)]",
].join(" ");

const ACCOUNT_MENU_BACKDROP_CLASS =
  "fixed inset-0 z-[115] box-border max-w-full overflow-x-hidden bg-black/55";

const ACCOUNT_MENU_BACKDROP_BOTTOM_NAV_CLASS =
  "fixed inset-0 z-[1195] box-border max-w-full overflow-x-hidden bg-black/55";

export function NavUserMenu({
  user,
  onNavigate,
  menuPlacement = "below",
  mobileMoreInMenu = false,
  compactTrigger = false,
  bottomNavTrigger = false,
}: NavUserMenuProps) {
  const menuId = useId();
  const useMobileFixedMenu = mobileMoreInMenu || bottomNavTrigger;
  /** AppSidebar + AppMobileHeader both mount NavUserMenu; `supabase.channel(name)` reuses one RealtimeChannel per name, so a second mount cannot chain `.on()` after the first `.subscribe()`. */
  const supportUnreadChannelSuffixRef = useRef<string>("");
  if (!supportUnreadChannelSuffixRef.current) {
    supportUnreadChannelSuffixRef.current = newRealtimeChannelSuffix();
  }
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
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
  const adminSupportUnread = useAdminSupportUnread();
  const scoutGate = useScoutVerification();
  const isScoutAccount = scoutGate.loaded && scoutGate.row?.role === "scout";
  const [userSupportUnread, setUserSupportUnread] = useState(0);
  const { showError } = useAppFeedback();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

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
      .channel(
        `user-support-unread-menu-${user.id}-${supportUnreadChannelSuffixRef.current}`,
      )
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
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        const menu = document.getElementById(menuId);
        if (menu?.contains(e.target as Node)) return;
        setOpen(false);
      }
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
  }, [open, menuId]);

  useEffect(() => {
    if (!open || !useMobileFixedMenu) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [open, useMobileFixedMenu]);

  useEffect(() => {
    if (!open || !useMobileFixedMenu || !isDev) return;
    const run = () => logAppShellPageOverflowOffenders(`${pathname}#account-menu`);
    const t0 = window.setTimeout(run, 0);
    const t1 = window.setTimeout(run, 500);
    const t2 = window.setTimeout(run, 1500);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open, useMobileFixedMenu, pathname]);

  async function onLogout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await signOut();
      setOpen(false);
      onNavigate?.();
      router.replace("/login");
      router.refresh();
    } catch (e) {
      devError("Nav logout error:", e);
      showError(tErr("generic"));
    } finally {
      setLogoutBusy(false);
    }
  }

  const linkClass =
    "flex w-full min-w-0 max-w-full items-center gap-3 overflow-x-hidden rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gn-text-secondary transition-colors duration-200 hover:bg-gn-surface-elevated hover:text-gn-text";

  const showUploadInMenu =
    uploadEligibility !== "non_player" && uploadEligibility !== "signed_out";
  const uploadMenuPrimary = uploadEligibility === "player" && !bottomNavTrigger;
  const uploadPathActive = navItemActive(pathname, "/upload");

  const menuPanelPositionClass = bottomNavTrigger
    ? ACCOUNT_MENU_PANEL_BOTTOM_NAV_CLASS
    : useMobileFixedMenu
      ? ACCOUNT_MENU_PANEL_MOBILE_CLASS
      : [
          ACCOUNT_MENU_PANEL_BASE_CLASS,
          "absolute end-0 z-[120] min-w-[13.5rem] w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]",
          menuPlacement === "above"
            ? "bottom-[calc(100%+0.5rem)]"
            : "top-[calc(100%+0.5rem)]",
        ].join(" ");

  const menuPanel = (
    <div
      id={menuId}
      data-account-menu
      role="menu"
      className={menuPanelPositionClass}
    >
      {bottomNavTrigger ? (
        <div className="flex min-w-0 items-center gap-3 border-b border-gn-border-subtle px-3 py-3">
          <ProfileAvatar
            name={displayNameFromUser(user)}
            imageUrl={avatarUrl}
            sizeClassName="size-10 min-h-10 min-w-10 max-h-10 max-w-10"
            className="!rounded-full ring-2 ring-gn-accent/45"
          />
          <p className="min-w-0 truncate text-sm font-semibold text-gn-text">
            {displayNameFromUser(user)}
          </p>
        </div>
      ) : null}

      {bottomNavTrigger ? (
        <>
          <Link
            href="/premium"
            role="menuitem"
            className={linkClass}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            <NavIcon name="premium" className="size-4 shrink-0 opacity-90" />
            {tNav("premium")}
          </Link>
          {!isScoutAccount ? (
            <Link
              href="/benefits"
              role="menuitem"
              className={linkClass}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              <NavIcon name="benefits" className="size-4 shrink-0 opacity-90" />
              {tNav("myBenefits")}
            </Link>
          ) : null}
          <Link
            href="/discover"
            role="menuitem"
            className={linkClass}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            <NavIcon name="discover" className="size-4 shrink-0 opacity-90" />
            {tNav("discover")}
          </Link>
          <div className="my-1 h-px bg-gn-border-subtle" role="separator" />
        </>
      ) : null}

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

      {mobileMoreInMenu ? (
        <>
          {!bottomNavTrigger ? (
            <>
              <div className="my-1 h-px bg-gn-border-subtle" role="separator" />
              <p className="min-w-0 truncate px-3 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gn-text-tertiary">
                {tNav("moreInMenu")}
              </p>
              <Link
                href="/explore"
                role="menuitem"
                className={linkClass}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
              >
                <NavIcon name="explore" className="size-4 shrink-0 opacity-90" />
                {tNav("explore")}
              </Link>
            </>
          ) : (
            <div className="my-1 h-px bg-gn-border-subtle" role="separator" />
          )}
          <Link
            href="/rankings"
            role="menuitem"
            className={linkClass}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            <NavIcon name="rankings" className="size-4 shrink-0 opacity-90" />
            {tNav("rankings")}
          </Link>
          <Link
            href="/notifications"
            role="menuitem"
            className={linkClass}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            <NavIcon name="messages" className="size-4 shrink-0 opacity-90" />
            {tNav("messages")}
          </Link>
        </>
      ) : null}

      {mobileMoreInMenu ? (
        <div className="box-border min-w-0 max-w-full overflow-x-hidden border-t border-gn-border-subtle px-2 py-2">
          <LanguageSwitcher className="w-full min-w-0 max-w-full [&_select]:w-full [&_select]:max-w-full" />
        </div>
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
  );

  return (
    <div className="relative shrink-0 overflow-visible" ref={wrapRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-label={tA11y("accountMenu")}
        onClick={() => setOpen((v) => !v)}
        className={
          "flex items-center transition-all duration-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg " +
          (bottomNavTrigger
            ? APP_MOBILE_BOTTOM_NAV_PROFILE_TRIGGER_CLASS
            : compactTrigger
              ? "h-9 w-9 min-w-9 max-w-9 shrink-0 gap-0 overflow-hidden rounded-full p-0"
              : "gap-2 rounded-full p-0.5")
        }
      >
        <ProfileAvatar
          name={displayNameFromUser(user)}
          imageUrl={avatarUrl}
          sizeClassName={
            bottomNavTrigger
              ? APP_MOBILE_BOTTOM_NAV_PROFILE_AVATAR_CLASS
              : compactTrigger
                ? "size-9 text-xs font-semibold"
                : "size-9 text-xs font-semibold"
          }
          className={
            bottomNavTrigger
              ? "!rounded-full ring-2 ring-white/30"
              : "ring-2 ring-gn-border-subtle"
          }
        />
        {compactTrigger ? null : (
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
        )}
      </button>

      {open && useMobileFixedMenu && portalReady
        ? createPortal(
            <>
              <button
                type="button"
                data-account-menu-backdrop
                className={
                  bottomNavTrigger
                    ? ACCOUNT_MENU_BACKDROP_BOTTOM_NAV_CLASS
                    : ACCOUNT_MENU_BACKDROP_CLASS
                }
                aria-hidden
                tabIndex={-1}
                onClick={() => setOpen(false)}
              />
              {menuPanel}
            </>,
            document.body,
          )
        : null}

      {open && !useMobileFixedMenu ? menuPanel : null}
    </div>
  );
}
