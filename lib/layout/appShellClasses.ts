/** Shared mobile app shell layout — single horizontal padding, no side safe-area (WhatsApp WebView-safe). */

/** V2 mobile shell: flex column between top bar and bottom tabs (see {@link MobileAppShell}). */
export const MOBILE_APP_SHELL_V2_CLASS =
  "relative mx-auto box-border flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-x-clip max-lg:h-svh max-lg:max-h-svh max-lg:min-h-0 max-lg:overflow-y-hidden lg:min-h-dvh";

/** V2 main scrollport — only this region scrolls on mobile. */
export const MOBILE_APP_SHELL_V2_MAIN_CLASS =
  "max-lg:flex-1 max-lg:min-h-0 max-lg:overflow-y-auto max-lg:overflow-x-clip max-lg:overscroll-y-contain";

export const MOBILE_TOP_BAR_V2_CLASS = [
  "relative z-[1] box-border w-full max-w-full shrink-0",
  "border-b border-gn-border-subtle bg-gn-bg",
  "pt-[max(0.25rem,env(safe-area-inset-top,0px))]",
  "pb-1",
  "min-h-[3.125rem]",
  "shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
  "lg:hidden",
].join(" ");

export const MOBILE_TOP_BAR_V2_INNER_CLASS =
  "box-border flex h-10 min-h-10 w-full max-w-full min-w-0 items-center justify-between gap-1 overflow-x-clip ps-[max(0.5rem,env(safe-area-inset-left,0px))] pe-[max(0.5rem,env(safe-area-inset-right,0px))]";

export const MOBILE_BOTTOM_TABS_V2_CLASS = [
  "relative z-[1] box-border w-full max-w-full min-w-0 shrink-0 overflow-x-clip bg-gn-bg",
  "border-t border-gn-border-subtle",
  "pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pt-0.5",
  "shadow-[0_-6px_20px_rgba(0,0,0,0.4)]",
  "lg:hidden",
].join(" ");

export const MOBILE_BOTTOM_TABS_V2_INNER_CLASS =
  "pointer-events-auto box-border grid h-12 w-full min-w-0 max-w-full grid-cols-5 items-end justify-items-center gap-0 overflow-x-clip ps-[max(0.5rem,env(safe-area-inset-left,0px))] pe-[max(0.5rem,env(safe-area-inset-right,0px))]";

export const MOBILE_BOTTOM_TABS_V2_ITEM_CLASS =
  "flex h-10 w-full min-w-0 max-w-full flex-col items-center justify-center gap-0.5 overflow-visible rounded-md border border-transparent px-0 py-0 text-[9px] font-medium leading-none tracking-tight min-[360px]:text-[10px]";

export const MOBILE_BOTTOM_TABS_V2_UPLOAD_FAB_CLASS =
  "pointer-events-auto -mt-4 flex w-full min-w-0 max-w-full flex-col items-center justify-end gap-0.5";

export const APP_SHELL_ROOT_CLASS =
  "relative mx-auto flex min-h-dvh min-w-0 w-full max-w-full overflow-x-clip bg-gn-bg text-gn-text max-lg:fixed max-lg:inset-x-0 max-lg:z-0 max-lg:min-h-0 max-lg:flex-col max-lg:overflow-x-clip max-lg:overflow-y-hidden max-lg:[--gn-app-header-offset:env(safe-area-inset-top,0px)] lg:flex-row";

export const APP_SHELL_COLUMN_CLASS =
  "relative mx-auto flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col ps-0 max-lg:min-h-0 lg:min-h-dvh lg:overflow-x-hidden lg:ps-[15.5rem]";

export const APP_SHELL_MAIN_CLASS = [
  "mx-auto box-border flex w-full min-w-0 max-w-full flex-1 flex-col items-stretch overflow-x-hidden px-4",
  "min-h-0 max-lg:min-h-0",
  "max-lg:pt-0 max-lg:pb-0",
  "lg:max-w-4xl lg:px-6 lg:pt-8 lg:pb-12",
].join(" ");

export const APP_SHELL_MAIN_INNER_CLASS =
  "mx-auto box-border flex w-full min-w-0 max-w-full min-h-0 flex-1 flex-col overflow-x-clip max-lg:min-h-0 max-lg:overflow-x-clip";

export const APP_MOBILE_HEADER_CLASS = [
  "relative z-[1] box-border w-full max-w-full shrink-0",
  "border-b border-gn-border-subtle bg-gn-bg",
  "pt-[env(safe-area-inset-top,0px)]",
  "shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
  "lg:hidden",
].join(" ");

export const APP_MOBILE_HEADER_INNER_CLASS =
  "mx-auto flex h-14 w-full max-w-full min-w-0 items-center gap-2 overflow-visible box-border px-3";

/** Fixed mount wrapper — sibling of {@link APP_SHELL_ROOT_CLASS}, not portaled. */
export const APP_MOBILE_BOTTOM_NAV_MOUNT_CLASS = [
  "pointer-events-auto visible fixed inset-x-0 bottom-0 left-0 right-0 z-[9999] box-border w-full max-w-full min-w-0",
  "overflow-x-clip overflow-y-visible opacity-100 max-lg:block lg:hidden",
  "pb-[env(safe-area-inset-bottom,0px)]",
].join(" ");

export const APP_MOBILE_BOTTOM_NAV_CLASS = [
  "pointer-events-auto visible relative z-[1] box-border w-full max-w-full min-w-0 shrink-0 overflow-x-clip overflow-y-visible opacity-100 bg-gn-bg",
  "min-h-[var(--gn-app-bottom-nav-offset,4.5rem)]",
  "border-t border-gn-border-subtle",
  "pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pt-0.5",
  "shadow-[0_-6px_20px_rgba(0,0,0,0.4)]",
  "lg:hidden",
].join(" ");

/** Inner grid for five bottom-nav items — never wider than the viewport. */
export const APP_MOBILE_BOTTOM_NAV_INNER_CLASS =
  "pointer-events-auto box-border grid h-10 w-full min-w-0 max-w-full grid-cols-5 items-center justify-items-center gap-0 overflow-x-clip ps-[max(0.5rem,env(safe-area-inset-left,0px))] pe-[max(0.5rem,env(safe-area-inset-right,0px))]";

export const APP_MOBILE_BOTTOM_NAV_ITEM_CLASS =
  "flex h-10 w-full min-w-0 max-w-full flex-col items-center justify-center gap-0.5 overflow-visible rounded-md border border-transparent px-0 py-0 text-[9px] font-medium leading-none tracking-tight min-[360px]:text-[10px]";

export const APP_MOBILE_BOTTOM_NAV_UPLOAD_LINK_CLASS =
  "pointer-events-auto flex h-10 w-full min-w-0 max-w-full flex-col items-center justify-center gap-0.5 border-0 bg-transparent p-0 shadow-none";

export const APP_MOBILE_BOTTOM_NAV_UPLOAD_BUTTON_CLASS =
  "relative box-border flex h-9 w-9 min-h-9 min-w-9 max-h-9 max-w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-500 p-0 shadow-md ring-1 ring-inset ring-orange-300/60 transition active:scale-[0.96] hover:bg-orange-400";

/** Colored emoji on standard bottom-nav tabs (native color, not muted by tab text). */
export const APP_MOBILE_BOTTOM_NAV_EMOJI_CLASS =
  "pointer-events-none block select-none text-[1.0625rem] leading-none opacity-100 grayscale-0";

/** Profile tab — opens account overflow menu (far right). */
export const APP_MOBILE_BOTTOM_NAV_PROFILE_CELL_CLASS =
  "flex h-10 w-full min-w-0 max-w-full flex-col items-center justify-center gap-0.5 overflow-visible px-0 py-0 text-[9px] font-medium leading-none text-gn-text-secondary min-[360px]:text-[10px]";

export const APP_MOBILE_BOTTOM_NAV_PROFILE_TRIGGER_CLASS =
  "flex size-9 min-h-9 min-w-9 max-h-9 max-w-9 shrink-0 items-center justify-center overflow-hidden !rounded-full border-0 bg-transparent p-0 shadow-none";

export const APP_MOBILE_BOTTOM_NAV_PROFILE_AVATAR_CLASS =
  "!size-9 !min-h-9 !min-w-9 !max-h-9 !max-w-9 shrink-0 !rounded-full text-[10px] font-semibold";

/** `/notifications` inbox — bounded column inside main shell padding. */
export const APP_MESSAGES_INBOX_PAGE_CLASS =
  "mx-auto box-border w-full min-w-0 max-w-lg overflow-x-clip lg:max-w-2xl";

/** `/messages/[id]` — full-height thread between mobile chrome (no extra page pb). */
export const APP_MESSAGES_THREAD_PAGE_CLASS = [
  "mx-auto box-border flex w-full min-w-0 max-w-full flex-col overflow-x-clip",
  "min-h-[calc(100dvh-var(--gn-app-header-offset)-var(--gn-app-bottom-nav-offset))]",
  "max-lg:pb-0 lg:max-w-2xl",
].join(" ");

/** Stable profile column — same width on loading skeleton and loaded content (mobile-first). */
export const APP_PROFILE_CONTENT_CLASS =
  "mx-auto box-border w-full min-w-0 max-w-md overflow-x-clip px-4";

export const APP_PROFILE_SHELL_CLASS = [
  APP_PROFILE_CONTENT_CLASS,
  "space-y-6 overflow-x-clip pb-8 lg:max-w-2xl",
].join(" ");

/**
 * Mobile tab pages in AppChromeLayout — same column as `/profile` (OwnProfileView).
 * Horizontal padding comes from `[data-app-main]`; no extra `px-*` on this shell.
 */
export const APP_MOBILE_TAB_PAGE_SHELL_CLASS =
  "box-border w-full min-w-0 max-w-full space-y-6 overflow-x-clip max-lg:pt-2 max-lg:pb-4 lg:pb-8 sm:mx-auto sm:max-w-2xl";

export const APP_PROFILE_LOADING_INNER_CLASS =
  "flex min-h-[35vh] w-full min-w-0 max-w-full flex-col items-center justify-center gap-2 text-sm text-gn-text-secondary";

/** `/player/[slug]` only — bounded column with horizontal padding (mobile-first). */
export const PUBLIC_PLAYER_PROFILE_PAGE_SHELL =
  "mx-auto box-border w-full min-w-0 max-w-md overflow-x-clip px-4 pb-8 lg:max-w-2xl";

/** Direct children inside {@link PUBLIC_PLAYER_PROFILE_PAGE_SHELL}. */
export const PUBLIC_PLAYER_PROFILE_SECTION_CLASS =
  "box-border w-full min-w-0 max-w-full overflow-x-clip";

/** `/scout-apply` — centered column; main shell already applies horizontal padding. */
export const SCOUT_APPLY_PAGE_SHELL_CLASS =
  "mx-auto box-border w-full min-w-0 max-w-lg overflow-x-clip";

/** Scout verification form and status cards. */
export const SCOUT_APPLY_SECTION_CLASS =
  "box-border w-full min-w-0 max-w-full overflow-x-clip";

/** `/scout-dashboard` — centered column; main shell already applies horizontal padding. */
export const SCOUT_DASHBOARD_PAGE_SHELL_CLASS =
  "mx-auto box-border w-full min-w-0 max-w-lg overflow-x-clip lg:max-w-4xl";

/** `/discover` — bounded column inside main shell padding (no extra horizontal px). */
export const DISCOVER_PAGE_SHELL_CLASS =
  "mx-auto box-border w-full min-w-0 max-w-lg overflow-x-clip pb-12 pt-4 lg:max-w-3xl lg:pb-8 lg:pt-6";

/** Scout dashboard sections, cards, and lists. */
export const SCOUT_DASHBOARD_SECTION_CLASS =
  "box-border w-full min-w-0 max-w-full overflow-x-clip";
