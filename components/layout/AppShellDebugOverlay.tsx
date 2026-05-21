"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

const MOBILE_MAX = 1023;

const WATCHED_SELECTORS: { label: string; query: string }[] = [
  { label: "html", query: "html" },
  { label: "body", query: "body" },
  { label: "[data-app-root]", query: "[data-app-root]" },
  { label: "[data-app-mobile-header]", query: "[data-app-mobile-header]" },
  { label: "[data-app-column]", query: "[data-app-column]" },
  { label: "[data-app-main]", query: "[data-app-main]" },
  { label: "[data-app-main-inner]", query: "[data-app-main-inner]" },
  { label: "[data-app-bottom-nav]", query: "[data-app-bottom-nav]" },
  { label: "[data-app-mobile-header] > div", query: "[data-app-mobile-header] > div" },
  {
    label: "[data-app-mobile-header-actions]",
    query: "[data-app-mobile-header-actions]",
  },
  {
    label: "[data-app-mobile-profile-trigger]",
    query: "[data-app-mobile-profile-trigger]",
  },
];

type ElementSnap = {
  label: string;
  found: boolean;
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
  position: string;
  zIndex: string;
  overflowX: string;
  overflowY: string;
  display: string;
  visibility: string;
  opacity: string;
};

type VisibilityGate = {
  show: boolean;
  reason: string | null;
};

function hasShellDebugInUrl(): boolean {
  if (typeof window === "undefined") return false;
  const { search, href } = window.location;
  return search.includes("shellDebug=1") || href.includes("shellDebug=1");
}

function resolvePathname(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname;
}

function isHomePage(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return normalized.endsWith("/home");
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth <= MOBILE_MAX) return true;
  return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;
}

function evaluateVisibility(): VisibilityGate {
  if (!hasShellDebugInUrl()) {
    return { show: false, reason: "no shellDebug" };
  }
  const pathname = resolvePathname();
  if (isHomePage(pathname)) {
    return { show: false, reason: "home path" };
  }
  if (!isMobileViewport()) {
    return { show: false, reason: "not mobile" };
  }
  return { show: true, reason: null };
}

function hasAppRoot(): boolean {
  return document.querySelector("[data-app-root]") instanceof HTMLElement;
}

function snapWatchedElement(label: string, el: HTMLElement | null): ElementSnap {
  if (!el) {
    return {
      label,
      found: false,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      scrollWidth: 0,
      clientWidth: 0,
      scrollHeight: 0,
      clientHeight: 0,
      scrollTop: 0,
      position: "—",
      zIndex: "—",
      overflowX: "—",
      overflowY: "—",
      display: "—",
      visibility: "—",
      opacity: "—",
    };
  }
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    label,
    found: true,
    top: Math.round(rect.top),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    scrollTop: el.scrollTop,
    position: cs.position,
    zIndex: cs.zIndex,
    overflowX: cs.overflowX,
    overflowY: cs.overflowY,
    display: cs.display,
    visibility: cs.visibility,
    opacity: cs.opacity,
  };
}

function collectWatchedElements(): ElementSnap[] {
  return WATCHED_SELECTORS.map(({ label, query }) => {
    const el = document.querySelector(query);
    return snapWatchedElement(label, el instanceof HTMLElement ? el : null);
  });
}

function formatElementBlock(s: ElementSnap): string {
  if (!s.found) return `${s.label}\n  (not found)`;
  return [
    s.label,
    `  rect T${s.top} L${s.left} R${s.right} B${s.bottom} W${s.width} H${s.height}`,
    `  scroll sw/cw=${s.scrollWidth}/${s.clientWidth} sh/ch=${s.scrollHeight}/${s.clientHeight} scrollTop=${s.scrollTop}`,
    `  pos=${s.position} z=${s.zIndex} ox/oy=${s.overflowX}/${s.overflowY}`,
    `  display=${s.display} visibility=${s.visibility} opacity=${s.opacity}`,
  ].join("\n");
}

function buildSuspects(elements: ElementSnap[], innerWidth: number): string[] {
  const lines: string[] = [];

  for (const s of elements) {
    if (!s.found) continue;
    if (s.scrollWidth > s.clientWidth + 1) {
      lines.push(`${s.label}: scrollWidth>clientWidth (${s.scrollWidth}>${s.clientWidth})`);
    }
    if (s.left < -1) {
      lines.push(`${s.label}: rect.left<0 (${s.left})`);
    }
    if (s.right > innerWidth + 1) {
      lines.push(`${s.label}: rect.right>innerWidth (${s.right}>${innerWidth})`);
    }
    const oy = s.overflowY;
    if (
      s.scrollHeight > s.clientHeight + 1 &&
      (oy === "auto" || oy === "scroll" || oy === "overlay")
    ) {
      lines.push(
        `${s.label}: vertical scroll candidate oy=${oy} sh/ch=${s.scrollHeight}/${s.clientHeight} scrollTop=${s.scrollTop}`,
      );
    }
  }

  if (window.scrollY > 0) {
    lines.push(`window.scrollY>0 (${window.scrollY})`);
  }

  const avatar = elements.find((e) => e.label === "[data-app-mobile-profile-trigger]");
  if (avatar?.found && avatar.width < 32) {
    lines.push(`AVATAR CLIPPED: trigger width=${avatar.width}px (<32)`);
  }

  return lines.length > 0 ? lines : ["(none among watched selectors)"];
}

function buildReport(pathname: string): string {
  const vv = window.visualViewport;
  const doc = document.documentElement;
  const body = document.body;
  const elements = collectWatchedElements();
  const root = elements.find((e) => e.label === "[data-app-root]");
  const header = elements.find((e) => e.label === "[data-app-mobile-header]");
  const bottomNav = elements.find((e) => e.label === "[data-app-bottom-nav]");

  const sections = [
    "SHELL DEBUG ACTIVE",
    `pathname=${pathname}`,
    `href=${window.location.href}`,
    `innerWidth=${window.innerWidth}`,
    "",
    root?.found ? "" : "note: [data-app-root] not in DOM yet",
    "",
    "— viewport —",
    `innerHeight: ${window.innerHeight}`,
    `visualViewport.width: ${vv?.width ?? "—"}`,
    `visualViewport.height: ${vv?.height ?? "—"}`,
    `visualViewport.offsetTop: ${vv?.offsetTop ?? "—"}`,
    `visualViewport.offsetLeft: ${vv?.offsetLeft ?? "—"}`,
    `window.scrollX: ${window.scrollX}`,
    `window.scrollY: ${window.scrollY}`,
    "",
    "— document —",
    `documentElement scrollWidth/clientWidth: ${doc.scrollWidth} / ${doc.clientWidth}`,
    `documentElement scrollHeight/clientHeight: ${doc.scrollHeight} / ${doc.clientHeight}`,
    `body scrollWidth/clientWidth: ${body.scrollWidth} / ${body.clientWidth}`,
    `body scrollHeight/clientHeight: ${body.scrollHeight} / ${body.clientHeight}`,
    "",
    `header fixed: ${header?.found ? `position=${header.position} z=${header.zIndex}` : "missing"}`,
    `bottom nav fixed: ${bottomNav?.found ? `position=${bottomNav.position} z=${bottomNav.zIndex}` : "missing"}`,
    "",
    "— elements —",
    ...elements.map((s) => formatElementBlock(s)),
    "",
    "— suspects —",
    ...buildSuspects(elements, window.innerWidth),
  ].filter(Boolean);

  return sections.join("\n");
}

const OVERLAY_CONTAINER_STYLE: CSSProperties = {
  position: "fixed",
  top: 8,
  left: 8,
  maxWidth: "calc(100vw - 16px)",
  maxHeight: "60vh",
  overflow: "auto",
  zIndex: 2147483647,
  pointerEvents: "none",
  background: "rgba(0, 0, 0, 0.88)",
  color: "#b7ff4a",
  margin: 0,
  padding: 10,
  boxSizing: "border-box",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const OVERLAY_BANNER_STYLE: CSSProperties = {
  display: "block",
  fontSize: 18,
  fontWeight: 800,
  lineHeight: 1.15,
  letterSpacing: "0.04em",
  color: "#e8ff7a",
  margin: "0 0 8px 0",
  padding: 0,
};

const OVERLAY_BODY_STYLE: CSSProperties = {
  fontSize: 10,
  lineHeight: 1.2,
  whiteSpace: "pre-wrap",
  margin: 0,
  padding: 0,
};

/**
 * Temporary non-home mobile shell debug (?shellDebug=1). Portaled to document.body; no layout impact.
 */
export function AppShellDebugOverlay() {
  const [portalReady, setPortalReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const lastWarnRef = useRef<string | null>(null);
  const lastRootWarnRef = useRef(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const warnHidden = useCallback((reason: string) => {
    if (lastWarnRef.current === reason) return;
    lastWarnRef.current = reason;
    console.warn(`[shell-debug] overlay hidden: ${reason}`);
  }, []);

  const refresh = useCallback(() => {
    const gate = evaluateVisibility();
    if (!gate.show) {
      if (gate.reason) warnHidden(gate.reason);
      lastRootWarnRef.current = false;
      setVisible(false);
      setText("");
      return;
    }

    lastWarnRef.current = null;

    if (!hasAppRoot() && !lastRootWarnRef.current) {
      lastRootWarnRef.current = true;
      console.warn("[shell-debug] no app root");
    }
    if (hasAppRoot()) {
      lastRootWarnRef.current = false;
    }

    const pathname = resolvePathname();
    setVisible(true);
    setText(buildReport(pathname));
  }, [warnHidden]);

  useEffect(() => {
    refresh();

    const vv = window.visualViewport;
    const onRefresh = () => refresh();

    window.addEventListener("scroll", onRefresh, true);
    window.addEventListener("resize", onRefresh);
    window.addEventListener("popstate", onRefresh);
    vv?.addEventListener("resize", onRefresh);
    vv?.addEventListener("scroll", onRefresh);

    const rafId = requestAnimationFrame(refresh);
    const t0 = window.setTimeout(refresh, 0);
    const t100 = window.setTimeout(refresh, 100);
    const t500 = window.setTimeout(refresh, 500);
    const intervalId = window.setInterval(refresh, 500);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(t0);
      window.clearTimeout(t100);
      window.clearTimeout(t500);
      window.clearInterval(intervalId);
      window.removeEventListener("scroll", onRefresh, true);
      window.removeEventListener("resize", onRefresh);
      window.removeEventListener("popstate", onRefresh);
      vv?.removeEventListener("resize", onRefresh);
      vv?.removeEventListener("scroll", onRefresh);
    };
  }, [refresh]);

  if (!portalReady || !visible || !text) return null;

  const bodyText = text.startsWith("SHELL DEBUG ACTIVE\n")
    ? text.slice("SHELL DEBUG ACTIVE\n".length)
    : text;

  return createPortal(
    <div data-shell-debug-overlay style={OVERLAY_CONTAINER_STYLE} aria-hidden>
      <div style={OVERLAY_BANNER_STYLE}>SHELL DEBUG ACTIVE</div>
      <pre style={OVERLAY_BODY_STYLE}>{bodyText}</pre>
    </div>,
    document.body,
  );
}
