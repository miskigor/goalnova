/** Shared layout tokens for mobile shell V2 (CSS vars + Tailwind-friendly constants). */

export const MLV2_ROOT_ATTR = "data-mobile-layout-stable-v2";

export const MLV2_SCROLL_ATTR = "data-mlv2-scroll";
export const MLV2_CONTENT_ATTR = "data-mlv2-content";
export const MLV2_BOTTOM_NAV_ATTR = "data-mlv2-bottom-nav";
export const MLV2_ROUTE_ATTR = "data-mlv2-route";

/** Matches player bottom bar (4.5rem chrome + safe area). */
export const MLV2_BOTTOM_NAV_OFFSET = "calc(4.5rem + env(safe-area-inset-bottom, 0px))";

/** Unified top inset (no mobile header). */
export const MLV2_TOP_OFFSET = "calc(var(--mlv2-page-top, 20px) + env(safe-area-inset-top, 0px))";

/** Content column width — same on home, profile, upload, admin, benefits, explore, challenges. */
export const MLV2_CONTENT_MAX_CLASS =
  "mx-auto box-border w-full min-w-0 max-w-[min(100%,390px)] max-lg:overflow-x-hidden";

export const MLV2_CONTENT_PAD_CLASS =
  "px-4 max-lg:pt-[var(--mlv2-top)] max-lg:pb-4 lg:px-6 lg:pt-8 lg:pb-12";
