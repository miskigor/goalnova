import type { CSSProperties } from "react";

/** Max home card size — actual size may shrink via CSS to keep meta visible. */
export const HOME_CLEAN_V3_CARD_WIDTH_PX = 272;
export const HOME_CLEAN_V3_CARD_HEIGHT_PX = 483;

/** Inline lock for home cards; dimensions come from homeCleanV3.css (fullscreen flex fill). */
export const HOME_CLEAN_V3_CARD_LOCK_STYLE: CSSProperties = {
  boxSizing: "border-box",
};
