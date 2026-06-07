import type { CSSProperties } from "react";

/** Production home card size — single source of truth (px only, no vw/dvh). */
export const HOME_CLEAN_V3_CARD_WIDTH_PX = 280;
export const HOME_CLEAN_V3_CARD_HEIGHT_PX = 498;

/** Inline lock so global V3 scroll rules cannot grow the card. */
export const HOME_CLEAN_V3_CARD_LOCK_STYLE: CSSProperties = {
  boxSizing: "border-box",
  width: HOME_CLEAN_V3_CARD_WIDTH_PX,
  height: HOME_CLEAN_V3_CARD_HEIGHT_PX,
  minWidth: HOME_CLEAN_V3_CARD_WIDTH_PX,
  maxWidth: HOME_CLEAN_V3_CARD_WIDTH_PX,
  minHeight: HOME_CLEAN_V3_CARD_HEIGHT_PX,
  maxHeight: HOME_CLEAN_V3_CARD_HEIGHT_PX,
  flex: "none",
};
