"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const REFRESH_MS = 500;

const LANDING_SELECTORS = [
  "[data-landing-root]",
  "header",
  "main",
  "[data-landing-hero]",
] as const;

type LandingDebugSnapshot = {
  pathname: string;
  userAgent: string;
  innerWidth: number;
  innerHeight: number;
  vvWidth: number;
  vvHeight: number;
  vvOffsetTop: number;
  vvOffsetLeft: number;
  scrollX: number;
  docScrollWidth: number;
  docClientWidth: number;
  bodyScrollWidth: number;
  bodyClientWidth: number;
  widestElement: string;
  rects: string[];
};

function igDebugEnabledFromLocation(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("igDebug") === "1";
}

function isLandingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return false;
  return routing.locales.includes(segments[0] as AppLocale);
}

function formatRect(el: Element | null, label: string): string {
  if (!el) return `${label}: (missing)`;
  const r = el.getBoundingClientRect();
  return `${label}: ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)} (right=${Math.round(r.right)})`;
}

function findWidestOverflowElement(): string {
  if (typeof document === "undefined") return "(ssr)";
  const vw = window.innerWidth;
  let bestOver = 0;
  let bestEl: HTMLElement | null = null;
  const queue: Element[] = [document.body];

  while (queue.length > 0) {
    const node = queue.pop()!;
    for (const child of node.children) {
      if (!(child instanceof HTMLElement)) continue;
      const r = child.getBoundingClientRect();
      const over = Math.max(child.scrollWidth - child.clientWidth, r.right - vw, 0);
      if (over > 1 && over > bestOver) {
        bestOver = over;
        bestEl = child;
      }
      queue.push(child);
    }
  }

  if (bestEl) {
    const tag = bestEl.tagName.toLowerCase();
    const cls = String(bestEl.className).replace(/\s+/g, " ").slice(0, 48);
    return `<${tag}.${cls || "?"}> +${Math.round(bestOver)}px`;
  }
  return "(none >1px past viewport)";
}

function collectSnapshot(pathname: string): LandingDebugSnapshot {
  const doc = document.documentElement;
  const body = document.body;
  const vv = window.visualViewport;

  const rects = LANDING_SELECTORS.map((sel) =>
    formatRect(document.querySelector(sel), sel),
  );

  return {
    pathname,
    userAgent: navigator.userAgent,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    vvWidth: vv?.width ?? 0,
    vvHeight: vv?.height ?? 0,
    vvOffsetTop: vv?.offsetTop ?? 0,
    vvOffsetLeft: vv?.offsetLeft ?? 0,
    scrollX: window.scrollX,
    docScrollWidth: doc.scrollWidth,
    docClientWidth: doc.clientWidth,
    bodyScrollWidth: body.scrollWidth,
    bodyClientWidth: body.clientWidth,
    widestElement: findWidestOverflowElement(),
    rects,
  };
}

function snapshotLines(s: LandingDebugSnapshot): string[] {
  return [
    `pathname: ${s.pathname}`,
    `userAgent: ${s.userAgent}`,
    `inner: ${s.innerWidth}×${s.innerHeight}`,
    `visualViewport: ${s.vvWidth}×${s.vvHeight} offset ${s.vvOffsetLeft},${s.vvOffsetTop}`,
    `scrollX: ${s.scrollX}`,
    `documentElement: scrollW=${s.docScrollWidth} clientW=${s.docClientWidth}`,
    `body: scrollW=${s.bodyScrollWidth} clientW=${s.bodyClientWidth}`,
    `widest overflow: ${s.widestElement}`,
    ...s.rects,
  ];
}

export function LandingIgDebugOverlay() {
  const pathname = usePathname() ?? "/";
  const [enabled, setEnabled] = useState(false);
  const [snapshot, setSnapshot] = useState<LandingDebugSnapshot | null>(null);
  const [mounted, setMounted] = useState(false);

  const landingPath = useMemo(() => isLandingPath(pathname), [pathname]);

  const refresh = useCallback(() => {
    if (!landingPath || !igDebugEnabledFromLocation()) return;
    setSnapshot(collectSnapshot(pathname));
  }, [landingPath, pathname]);

  useEffect(() => {
    setMounted(true);
    const on = igDebugEnabledFromLocation() && isLandingPath(pathname);
    setEnabled(on);
    if (!on) return;

    refresh();
    const id = window.setInterval(refresh, REFRESH_MS);
    window.visualViewport?.addEventListener("resize", refresh);
    window.visualViewport?.addEventListener("scroll", refresh);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, { passive: true });

    return () => {
      window.clearInterval(id);
      window.visualViewport?.removeEventListener("resize", refresh);
      window.visualViewport?.removeEventListener("scroll", refresh);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh);
    };
  }, [pathname, refresh, landingPath]);

  if (!mounted || !enabled || !landingPath || !snapshot) return null;

  const lines = snapshotLines(snapshot);

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] max-h-[45vh] overflow-y-auto border-t border-orange-500/50 bg-black/92 p-2 font-mono text-[10px] leading-snug text-orange-100 shadow-lg backdrop-blur-sm pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <p className="mb-1 font-sans text-[11px] font-bold text-orange-400">IG landing debug (?igDebug=1)</p>
      {lines.map((line) => (
        <p key={line} className="break-all">
          {line}
        </p>
      ))}
    </div>,
    document.body,
  );
}
