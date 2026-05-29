/**
 * Shared letterboxed video/poster presentation — bounded parent box, never viewport crop.
 * Use on feed tiles, profile grid, explore, public watch, and challenge previews.
 */
export const GN_VIDEO_MEDIA_DATA_ATTR = "data-gn-video-media" as const;

export const gnVideoMediaDataProps = {
  [GN_VIDEO_MEDIA_DATA_ATTR]: true,
} as const;

/** Outer stage filling the card/tile slot (not the viewport). */
export const GN_VIDEO_MEDIA_STAGE_CLASS =
  "relative box-border h-full w-full max-h-full max-w-full min-h-0 min-w-0 overflow-hidden bg-black";

/** Stage that centers a single video/img inside the slot. */
export const GN_VIDEO_MEDIA_STAGE_FLEX_CLASS =
  "relative box-border flex h-full w-full max-h-full max-w-full min-h-0 min-w-0 items-center justify-center overflow-hidden bg-black";

/** `<video>` / inline media — full box with letterbox fit. */
export const GN_VIDEO_MEDIA_ELEMENT_CLASS =
  "box-border h-full w-full max-h-full max-w-full min-h-0 min-w-0 object-contain object-center [color-scheme:dark]";

/** Absolutely positioned media inside a relative stage. */
export const GN_VIDEO_MEDIA_ELEMENT_ABSOLUTE_CLASS =
  `pointer-events-none absolute inset-0 z-0 ${GN_VIDEO_MEDIA_ELEMENT_CLASS}`;

/** Static poster / Next `Image` with fill or block layout. */
export const GN_VIDEO_MEDIA_POSTER_CLASS =
  "box-border h-full w-full max-h-full max-w-full min-h-0 min-w-0 object-contain object-center";

export const GN_VIDEO_MEDIA_POSTER_ABSOLUTE_CLASS =
  `pointer-events-none absolute inset-0 z-0 ${GN_VIDEO_MEDIA_POSTER_CLASS}`;

/** Profile 3-column grid — fills fixed 9:16 cell (no letterbox shrink as metadata loads). */
export const PROFILE_GRID_VIDEO_TILE_CLASS =
  "pointer-events-none absolute inset-0 z-0 size-full object-cover object-center [color-scheme:dark]";
