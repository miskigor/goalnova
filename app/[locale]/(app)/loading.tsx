/**
 * Page-segment loading for `(app)` routes. `(app)/layout` keeps {@link AppChromeLayout}
 * mounted; this only fills the main column while the page RSC boundary resolves.
 */
export default function AppSectionLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-1 items-center justify-center"
      role="status"
      aria-busy
      aria-label="Loading"
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
  );
}
