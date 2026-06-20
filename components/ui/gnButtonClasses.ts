const GN_TRANSITION =
  "transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ease-gn-smooth motion-reduce:transition-none";

/** Primary CTA — orange, used across PitchRusch for main actions. */
export const GN_PRIMARY_BUTTON_CLASS =
  `inline-flex max-w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-gn-accent px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_28px_-6px_rgba(249,115,22,0.45)] ring-1 ring-white/10 ${GN_TRANSITION} hover:bg-gn-accent-hover hover:shadow-[0_12px_36px_-8px_rgba(249,115,22,0.55)] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed`;

/** Success / confirm — emerald green for positive profile actions. */
export const GN_SUCCESS_BUTTON_CLASS =
  `inline-flex max-w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_28px_-6px_rgba(16,185,129,0.45)] ring-1 ring-white/10 ${GN_TRANSITION} hover:bg-emerald-400 hover:shadow-[0_12px_36px_-8px_rgba(16,185,129,0.55)] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gn-bg disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed`;

/** Secondary / outline — Explore, back actions, less emphasis. */
export const GN_SECONDARY_BUTTON_CLASS =
  `inline-flex items-center justify-center gap-2 rounded-xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-3 text-sm font-semibold text-gn-text ${GN_TRANSITION} hover:border-white/[0.12] hover:bg-gn-surface-elevated/55 hover:shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)] motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/35 disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed`;
