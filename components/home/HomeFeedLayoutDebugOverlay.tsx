"use client";

import { useEffect, useState } from "react";

const LAYOUT_DEBUG_PROBE_SELECTORS = [
  "[data-app-root]",
  "[data-app-main]",
  "[data-app-main-inner]",
  "[data-pitchrusch-home-feed]",
  "[data-pitchrusch-feed-scroll-root]",
  "[data-pitchrusch-feed-card]",
  "[data-pitchrusch-feed-meta]",
  "[data-pitchrusch-feed-rail]",
] as const;

function layoutDebugEnabledFromLocation(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("layoutDebug") === "1";
}

function buildLayoutDebugLines(): string[] {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return ["layoutDebug: no window"];
  }

  const vv = window.visualViewport;
  const lines: string[] = [
    `innerWidth: ${window.innerWidth}`,
    `visualViewport.width: ${vv?.width ?? "n/a"}`,
    `scrollX: ${window.scrollX}`,
    `doc.scrollLeft: ${document.documentElement.scrollLeft}`,
    `doc.scrollWidth: ${document.documentElement.scrollWidth}`,
    `body.scrollWidth: ${document.body.scrollWidth}`,
  ];

  for (const selector of LAYOUT_DEBUG_PROBE_SELECTORS) {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLElement)) {
      lines.push(`${selector}: (missing)`);
      continue;
    }
    const r = el.getBoundingClientRect();
    lines.push(
      `${selector}: L${Math.round(r.left)} W${Math.round(r.width)}`,
    );
  }

  return lines;
}

/**
 * Production-safe layout probe: `/hr/home?layoutDebug=1`
 * Fixed overlay; pointer-events-none; does not affect document flow.
 */
export function HomeFeedLayoutDebugOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const on = layoutDebugEnabledFromLocation();
    setEnabled(on);
    if (!on) return;

    const refresh = () => setLines(buildLayoutDebugLines());
    refresh();
    const interval = window.setInterval(refresh, 400);
    window.addEventListener("resize", refresh, { passive: true });
    window.visualViewport?.addEventListener("resize", refresh);
    window.visualViewport?.addEventListener("scroll", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", refresh);
      window.visualViewport?.removeEventListener("resize", refresh);
      window.visualViewport?.removeEventListener("scroll", refresh);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[300] m-0 box-border max-h-[70vh] max-w-[min(100%,14rem)] overflow-y-auto rounded-br-md bg-black/80 p-1.5 font-mono text-[9px] leading-tight text-lime-300 shadow-md ring-1 ring-white/20"
      aria-hidden
      data-pitchrusch-home-feed-layout-debug
    >
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}
