/** Player-only primary Upload CTA in the app sidebar (dark UI + orange glow). */
export const SIDEBAR_PLAYER_UPLOAD_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-gn-accent px-3 py-3 text-sm font-semibold text-black shadow-[0_0_32px_-6px_rgba(249,115,22,0.52)] ring-1 ring-white/15 transition-[background-color,box-shadow,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors hover:bg-gn-accent-hover hover:shadow-[0_0_40px_-4px_rgba(249,115,22,0.62)] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg";

/** Active route `/upload` — slightly tighter ring, keeps orange readable on dark chrome. */
export const SIDEBAR_PLAYER_UPLOAD_ACTIVE_CLASS =
  "ring-2 ring-gn-accent/70 shadow-[0_0_36px_-4px_rgba(249,115,22,0.55)]";

/** Account menu: player Upload as first-class action without overpowering the panel. */
export const NAV_MENU_PLAYER_UPLOAD_CLASS =
  "flex w-full items-center gap-3 rounded-lg border-s-[3px] border-gn-accent bg-gn-accent/[0.09] py-2.5 pe-3 ps-2.5 text-left text-sm font-semibold text-gn-accent transition-[background-color,transform] duration-300 ease-gn-smooth hover:bg-gn-accent/18 motion-safe:active:scale-[0.99]";
