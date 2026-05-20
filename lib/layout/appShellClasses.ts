/** Shared mobile app shell layout — single horizontal padding, no side safe-area (WhatsApp WebView-safe). */

export const APP_SHELL_ROOT_CLASS =
  "relative mx-auto flex min-h-dvh min-w-0 w-full max-w-full overflow-x-hidden bg-gn-bg text-gn-text max-lg:h-full max-lg:max-h-full max-lg:min-h-0 max-lg:flex-col max-lg:overflow-y-hidden lg:flex-row";

export const APP_SHELL_COLUMN_CLASS =
  "relative mx-auto flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col ps-0 max-lg:min-h-0 lg:min-h-dvh lg:overflow-x-hidden lg:ps-[15.5rem]";

export const APP_SHELL_MAIN_CLASS = [
  "mx-auto box-border flex w-full min-w-0 max-w-full flex-1 flex-col items-stretch overflow-x-hidden px-4",
  "min-h-0 max-lg:min-h-0",
  "pt-[var(--gn-app-header-offset)]",
  "pb-[var(--gn-app-bottom-nav-offset)]",
  "lg:max-w-4xl lg:px-6 lg:pt-8 lg:pb-12",
].join(" ");

export const APP_SHELL_MAIN_INNER_CLASS =
  "mx-auto box-border flex w-full min-w-0 max-w-full min-h-0 flex-1 flex-col overflow-x-hidden max-lg:min-h-0";

export const APP_MOBILE_HEADER_CLASS = [
  "fixed top-0 left-0 right-0 z-[70] box-border w-full max-w-full shrink-0",
  "border-b border-gn-border-subtle bg-gn-bg/95",
  "pt-[env(safe-area-inset-top,0px)]",
  "shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl supports-[backdrop-filter]:bg-gn-bg/90",
  "lg:hidden",
].join(" ");

export const APP_MOBILE_HEADER_INNER_CLASS =
  "mx-auto flex h-14 w-full max-w-full min-w-0 items-center justify-between gap-2 overflow-x-hidden box-border px-4";

export const APP_MOBILE_BOTTOM_NAV_CLASS = [
  "pointer-events-auto fixed bottom-0 left-0 right-0 z-[80] box-border w-full max-w-full min-w-0 overflow-x-hidden",
  "border-t border-gn-border-subtle bg-gn-bg",
  "pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1",
  "shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-gn-bg/95",
  "lg:hidden",
].join(" ");

/** Inner grid for five bottom-nav items — never wider than the viewport. */
export const APP_MOBILE_BOTTOM_NAV_INNER_CLASS =
  "pointer-events-auto mx-auto grid h-14 w-full min-w-0 max-w-md grid-cols-5 items-stretch gap-0 overflow-x-hidden px-1 box-border";

export const APP_MOBILE_BOTTOM_NAV_ITEM_CLASS =
  "flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[10px] font-semibold leading-[1.05] tracking-tight";

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
