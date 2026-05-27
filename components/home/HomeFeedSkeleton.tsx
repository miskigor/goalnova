/** Lightweight placeholder while the home feed chunk loads (code-split). */
export function HomeFeedSkeleton() {
  return (
    <div
      data-pitchrusch-home-feed
      data-pitchrusch-home-feed-skeleton
      className="mx-auto flex h-full min-h-0 w-full min-w-0 max-w-lg flex-1 flex-col max-lg:mx-0 max-lg:h-full max-lg:w-full max-lg:max-w-full max-lg:overflow-x-clip"
    >
      <div
        className="flex min-h-[12rem] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-12 text-sm text-gn-text-secondary"
        role="status"
        aria-busy
      >
      <svg
        className="h-8 w-8 animate-spin text-gn-accent"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
        />
      </svg>
      <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
