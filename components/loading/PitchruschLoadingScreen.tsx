"use client";

type PitchruschLoadingScreenProps = {
  fullScreen?: boolean;
  label?: string;
};

/**
 * Branded black loading screen used for first paint and auth checks.
 * Uses local static logo so it renders immediately on cold loads.
 */
export function PitchruschLoadingScreen({
  fullScreen = true,
  label = "Učitavanje…",
}: PitchruschLoadingScreenProps) {
  return (
    <div
      style={{
        margin: 0,
        width: "100%",
        minWidth: 0,
        backgroundColor: "#fff",
        color: "#0a0a0a",
        minHeight: fullScreen ? "100dvh" : "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
      className={[
        "w-full min-w-0 bg-gn-bg px-4 text-gn-text",
        fullScreen
          ? "flex min-h-dvh items-center justify-center"
          : "flex min-h-[50vh] items-center justify-center",
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-busy
      aria-label={label}
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <img
          src="/brand/pitchrusch-logo.svg"
          alt="PitchRusch"
          width={88}
          height={88}
          className="h-20 w-20 select-none"
          loading="eager"
          decoding="async"
        />
        <div className="flex items-center gap-2 text-sm text-gn-text-secondary">
          <svg
            className="h-4 w-4 animate-spin text-gn-accent"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
            />
          </svg>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}
