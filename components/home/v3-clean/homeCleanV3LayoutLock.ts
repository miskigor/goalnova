import type { CSSProperties } from "react";

/** Max home card size — actual size may shrink via CSS to keep meta visible. */
export const HOME_CLEAN_V3_CARD_WIDTH_PX = 272;
export const HOME_CLEAN_V3_CARD_HEIGHT_PX = 483;

/** Prevent V3 scroll rules from growing the card; dimensions come from homeCleanV3.css. */
export const HOME_CLEAN_V3_CARD_LOCK_STYLE: CSSProperties = {
  boxSizing: "border-box",
  flex: "none",
};
