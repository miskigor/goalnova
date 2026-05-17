/** Shared mobile app shell layout — single horizontal padding, no side safe-area (WhatsApp WebView-safe). */

export const APP_SHELL_ROOT_CLASS =
  "relative mx-auto flex min-h-dvh min-w-0 w-full max-w-full overflow-x-hidden bg-gn-bg text-gn-text";

export const APP_SHELL_COLUMN_CLASS =
  "mx-auto flex min-h-dvh min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden ps-0 lg:ps-[15.5rem]";

export const APP_SHELL_MAIN_CLASS = [
  "mx-auto box-border flex w-full min-w-0 max-w-full flex-1 flex-col items-stretch overflow-x-clip px-4",
  "pt-[calc(3.5rem+env(safe-area-inset-top,0px))]",
  "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
  "lg:max-w-4xl lg:px-6 lg:pt-8 lg:pb-12",
].join(" ");

export const APP_SHELL_MAIN_INNER_CLASS =
  "mx-auto box-border w-full min-w-0 max-w-full overflow-x-hidden";

export const APP_MOBILE_HEADER_CLASS = [
  "fixed top-0 left-0 right-0 z-[55] box-border w-full max-w-full shrink-0 overflow-x-clip",
  "border-b border-gn-border-subtle bg-gn-bg/95",
  "pt-[env(safe-area-inset-top,0px)]",
  "shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl supports-[backdrop-filter]:bg-gn-bg/90",
  "lg:hidden",
].join(" ");

export const APP_MOBILE_HEADER_INNER_CLASS =
  "mx-auto flex h-14 w-full max-w-full min-w-0 items-center justify-between gap-2 box-border px-4";

export const APP_MOBILE_BOTTOM_NAV_CLASS = [
  "fixed bottom-0 left-0 right-0 z-[60] box-border flex w-full max-w-full min-w-0 overflow-x-clip",
  "border-t border-gn-border-subtle bg-gn-bg/95 px-2",
  "pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1",
  "shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-gn-bg/90",
  "lg:hidden",
].join(" ");

/** Stable profile column — same width on loading skeleton and loaded content (mobile-first). */
export const APP_PROFILE_CONTENT_CLASS =
  "mx-auto box-border w-full min-w-0 max-w-md overflow-x-clip";

export const APP_PROFILE_SHELL_CLASS = [
  APP_PROFILE_CONTENT_CLASS,
  "space-y-6 overflow-x-hidden pb-8 lg:max-w-2xl",
].join(" ");

export const APP_PROFILE_LOADING_INNER_CLASS =
  "flex min-h-[35vh] w-full min-w-0 max-w-full flex-col items-center justify-center gap-2 text-sm text-gn-text-secondary";
