"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "@/i18n/navigation";
import { useNavSession } from "@/components/layout/useNavSession";
import { supabase } from "@/lib/supabase/client";

const REFRESH_MS = 500;
const SHELL_SELECTORS = [
  "[data-app-root]",
  "[data-app-mobile-header]",
  "[data-app-bottom-nav]",
  "[data-app-main]",
  "[data-app-main-inner]",
] as const;

type ShellDebugSnapshot = {
  pathname: string;
  shellType: string;
  innerWidth: number;
  vvWidth: number;
  vvHeight: number;
  vvOffsetTop: number;
  vvOffsetLeft: number;
  scrollX: number;
  scrollY: number;
  docScrollWidth: number;
  docClientWidth: number;
  bodyScrollWidth: number;
  bodyClientWidth: number;
  headerInDom: boolean;
  bottomNavInDom: boolean;
  horizontalOverflow: string;
  verticalScroller: string;
  elements: string[];
  deployCommit: string;
  bundleProbe: string;
  userAgent: string;
  sbStorageKeys: string;
  supabaseTokenExists: boolean;
  navAuthed: string;
  authEventsCount: number;
  lastAuthEvent: string;
};

function deployCommitLabel(): string {
  return (
    process.env.NEXT_PUBLIC_DEPLOY_COMMIT ??
    process.env.NEXT_PUBLIC_COMMIT_SHA ??
    "(not set at build)"
  );
}

function listSbLocalStorageKeys(): string {
  if (typeof window === "undefined") return "(ssr)";
  try {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith("sb-"));
    return keys.length > 0 ? keys.join(", ") : "(none)";
  } catch {
    return "(localStorage blocked)";
  }
}

function supabaseAuthTokenExists(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return false;
    const ref = new URL(url).hostname.split(".")[0];
    const raw = window.localStorage.getItem(`sb-${ref}-auth-token`);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { access_token?: string };
    return (
      typeof parsed?.access_token === "string" && parsed.access_token.length > 0
    );
  } catch {
    return false;
  }
}

async function probeUseNavSessionBundle(): Promise<string> {
  const scripts = [
    ...document.querySelectorAll('script[src*="/_next/static/chunks/"]'),
  ]
    .map((el) => (el as HTMLScriptElement).src)
    .filter(Boolean);

  for (const src of scripts) {
    try {
      const text = await (await fetch(src)).text();
      if (text.includes("},22e3)") && text.includes("getUser")) {
        return "4ce53aa+ (22s failsafe, getUser fallback)";
      }
      if (text.includes("prev===null?false")) {
        return "pre-4ce53aa (10s failsafe → false)";
      }
    } catch {
      /* skip unreadable chunk */
    }
  }

  return "unknown (chunk marker not found)";
}

function shellDebugEnabledFromLocation(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("shellDebug") === "1";
}

function isHomePath(pathname: string): boolean {
  return pathname === "/home" || pathname.endsWith("/home");
}

function detectShellType(): string {
  if (document.querySelector("[data-app-root]")) return "APP SHELL";
  if (document.querySelector("[data-public-shell]")) return "PUBLIC SHELL";
  return "NO APP ROOT";
}

function formatComputed(el: HTMLElement): string {
  const cs = getComputedStyle(el);
  return [
    `position:${cs.position}`,
    `top:${cs.top}`,
    `left:${cs.left}`,
    `right:${cs.right}`,
    `width:${cs.width}`,
    `z-index:${cs.zIndex}`,
    `transform:${cs.transform}`,
    `visibility:${cs.visibility}`,
    `display:${cs.display}`,
  ].join(" ");
}

function formatRect(el: HTMLElement): string {
  const r = el.getBoundingClientRect();
  return `top=${Math.round(r.top)} left=${Math.round(r.left)} right=${Math.round(r.right)} w=${Math.round(r.width)} h=${Math.round(r.height)}`;
}

function describeElement(selector: string): string | null {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) {
    return `${selector}: (missing)`;
  }
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const data = Object.entries(el.dataset)
    .map(([k, v]) => `data-${k}=${v ?? ""}`)
    .join(" ");
  return [
    `${selector} <${tag}${id}>`,
    `  ${data || "(no data-*)"}`,
    `  computed: ${formatComputed(el)}`,
    `  rect: ${formatRect(el)}`,
  ].join("\n");
}

function findHorizontalOverflowLines(viewportWidth: number, limit = 6): string {
  const lines: string[] = [];
  const walk = (node: ParentNode) => {
    if (lines.length >= limit) return;
    for (const child of node.childNodes) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.hasAttribute("data-app-shell-debug-overlay")) continue;

      const rect = child.getBoundingClientRect();
      const reasons: string[] = [];
      if (child.scrollWidth > child.clientWidth + 1) {
        reasons.push(`scrollW>${child.clientWidth}`);
      }
      if (child.offsetLeft < -1) reasons.push(`offsetLeft=${child.offsetLeft}`);
      if (rect.right > viewportWidth + 1) {
        reasons.push(`rect.right>${viewportWidth}`);
      }
      if (rect.left < -1) reasons.push(`rect.left<0`);

      if (reasons.length > 0) {
        const label =
          child.tagName.toLowerCase() +
          (child.id ? `#${child.id}` : "") +
          (child.dataset.appRoot ? " [data-app-root]" : "") +
          (child.dataset.appMain ? " [data-app-main]" : "") +
          (child.dataset.appBottomNav ? " [data-app-bottom-nav]" : "") +
          (child.dataset.appMobileHeader ? " [data-app-mobile-header]" : "");
        lines.push(`${label}: ${reasons.join(", ")}`);
      }
      walk(child);
    }
  };

  walk(document.body);
  return lines.length > 0 ? lines.join("\n") : "(none)";
}

function findVerticalScroller(): string {
  const candidates: Array<{ label: string; el: HTMLElement | null }> = [
    { label: "html", el: document.documentElement },
    { label: "body", el: document.body },
    { label: "[data-app-root]", el: document.querySelector("[data-app-root]") as HTMLElement | null },
    { label: "[data-app-main]", el: document.querySelector("[data-app-main]") as HTMLElement | null },
    { label: "[data-app-main-inner]", el: document.querySelector("[data-app-main-inner]") as HTMLElement | null },
  ];

  const hits: string[] = [];
  for (const { label, el } of candidates) {
    if (!el) continue;
    const style = getComputedStyle(el);
    const overflowY = style.overflowY;
    const canScroll = el.scrollHeight > el.clientHeight + 1;
    const scrollableStyle = /auto|scroll|overlay/i.test(overflowY);
    if (canScroll || el.scrollTop > 0) {
      hits.push(
        `${label} overflowY=${overflowY} scrollTop=${el.scrollTop} sh=${el.scrollHeight} ch=${el.clientHeight}${scrollableStyle ? " *scrollable*" : ""}`,
      );
    }
  }

  return hits.length > 0 ? hits.join("\n") : "(none)";
}

function collectSnapshot(
  pathname: string,
  extras: {
    bundleProbe: string;
    navAuthed: boolean | null;
    authEventsCount: number;
    lastAuthEvent: string;
  },
): ShellDebugSnapshot {
  const vv = window.visualViewport;
  const viewportWidth = window.innerWidth;

  const elements: string[] = [];
  for (const selector of SHELL_SELECTORS) {
    const line = describeElement(selector);
    if (line) elements.push(line);
  }

  const navAuthedLabel =
    extras.navAuthed === null
      ? "null (loading)"
      : extras.navAuthed
        ? "true"
        : "false";

  return {
    pathname,
    shellType: detectShellType(),
    innerWidth: window.innerWidth,
    vvWidth: vv?.width ?? 0,
    vvHeight: vv?.height ?? 0,
    vvOffsetTop: vv?.offsetTop ?? 0,
    vvOffsetLeft: vv?.offsetLeft ?? 0,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    docScrollWidth: document.documentElement.scrollWidth,
    docClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    headerInDom: Boolean(document.querySelector("[data-app-mobile-header]")),
    bottomNavInDom: Boolean(document.querySelector("[data-app-bottom-nav]")),
    horizontalOverflow: findHorizontalOverflowLines(viewportWidth),
    verticalScroller: findVerticalScroller(),
    elements,
    deployCommit: deployCommitLabel(),
    bundleProbe: extras.bundleProbe,
    userAgent: navigator.userAgent,
    sbStorageKeys: listSbLocalStorageKeys(),
    supabaseTokenExists: supabaseAuthTokenExists(),
    navAuthed: navAuthedLabel,
    authEventsCount: extras.authEventsCount,
    lastAuthEvent: extras.lastAuthEvent,
  };
}

function snapshotToText(snapshot: ShellDebugSnapshot): string {
  return [
    `pathname: ${snapshot.pathname}`,
    `shell: ${snapshot.shellType}`,
    `deploy commit (build env): ${snapshot.deployCommit}`,
    `useNavSession bundle: ${snapshot.bundleProbe}`,
    `navigator.userAgent: ${snapshot.userAgent}`,
    `localStorage sb-* keys: ${snapshot.sbStorageKeys}`,
    `supabase auth token in localStorage: ${snapshot.supabaseTokenExists ? "YES" : "NO"}`,
    `useNavSession authed: ${snapshot.navAuthed}`,
    `auth events: count=${snapshot.authEventsCount} last=${snapshot.lastAuthEvent}`,
    `innerWidth: ${snapshot.innerWidth}`,
    `visualViewport: ${snapshot.vvWidth} x ${snapshot.vvHeight}`,
    `visualViewport offset: top=${snapshot.vvOffsetTop} left=${snapshot.vvOffsetLeft}`,
    `window scroll: x=${snapshot.scrollX} y=${snapshot.scrollY}`,
    `documentElement: scrollW=${snapshot.docScrollWidth} clientW=${snapshot.docClientWidth}`,
    `body: scrollW=${snapshot.bodyScrollWidth} clientW=${snapshot.bodyClientWidth}`,
    `header in DOM: ${snapshot.headerInDom}`,
    `bottom nav in DOM: ${snapshot.bottomNavInDom}`,
    "",
    "--- elements ---",
    snapshot.elements.join("\n\n"),
    "",
    "--- horizontal overflow ---",
    snapshot.horizontalOverflow,
    "",
    "--- vertical scroller ---",
    snapshot.verticalScroller,
  ].join("\n");
}

/**
 * Mobile shell diagnostics — only when `?shellDebug=1` and not on /home.
 * Portal overlay; does not affect layout (pointer-events: none).
 */
export function AppShellDebugOverlay() {
  const pathname = usePathname();
  const { authed: navAuthed } = useNavSession();
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState("");
  const [bundleProbe, setBundleProbe] = useState("pending…");
  const [authEventsCount, setAuthEventsCount] = useState(0);
  const [lastAuthEvent, setLastAuthEvent] = useState("-");

  const shouldShow = useMemo(
    () => enabled && !isHomePath(pathname),
    [enabled, pathname],
  );

  const refresh = useCallback(() => {
    if (!shellDebugEnabledFromLocation() || isHomePath(pathname)) return;
    setText(
      snapshotToText(
        collectSnapshot(pathname, {
          bundleProbe,
          navAuthed,
          authEventsCount,
          lastAuthEvent,
        }),
      ),
    );
  }, [pathname, bundleProbe, navAuthed, authEventsCount, lastAuthEvent]);

  useEffect(() => {
    setEnabled(shellDebugEnabledFromLocation());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void probeUseNavSessionBundle().then((label) => {
      if (!cancelled) setBundleProbe(label);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      setAuthEventsCount((n) => n + 1);
      setLastAuthEvent(event);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || isHomePath(pathname)) return;

    refresh();
    const intervalId = window.setInterval(refresh, REFRESH_MS);

    const onViewportChange = () => refresh();
    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);
    window.visualViewport?.addEventListener("resize", onViewportChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
    };
  }, [enabled, pathname, refresh]);

  if (!mounted || !shouldShow) {
    return null;
  }

  return createPortal(
    <div
      data-app-shell-debug-overlay
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        pointerEvents: "none",
        overflow: "auto",
        padding: "8px",
        paddingTop: "max(8px, env(safe-area-inset-top))",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        boxSizing: "border-box",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "10px",
        lineHeight: 1.35,
        color: "#fff",
        background: "rgba(0, 0, 0, 0.82)",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          marginBottom: "8px",
          color: "#f97316",
        }}
      >
        SHELL DEBUG ACTIVE
      </div>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text}
      </pre>
    </div>,
    document.body,
  );
}
