import { isDev } from "@/lib/devLog";

export type HorizontalOverflowHit = {
  tag: string;
  id: string | null;
  className: string;
  scrollWidth: number;
  clientWidth: number;
  offsetLeft: number;
};

/** Development-only: log elements wider than their layout box (likely horizontal overflow). */
export function logHorizontalOverflowOffenders(
  root: ParentNode = document.body,
  limit = 15,
): HorizontalOverflowHit[] {
  if (!isDev || typeof document === "undefined") return [];

  const hits: HorizontalOverflowHit[] = [];

  const walk = (node: ParentNode) => {
    for (const child of node.childNodes) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.scrollWidth > child.clientWidth + 1 || child.offsetLeft < -1) {
        hits.push({
          tag: child.tagName.toLowerCase(),
          id: child.id || null,
          className: String(child.className).slice(0, 120),
          scrollWidth: child.scrollWidth,
          clientWidth: child.clientWidth,
          offsetLeft: child.offsetLeft,
        });
      }
      walk(child);
    }
  };

  walk(root);

  if (hits.length > 0) {
    console.warn(
      `[layout-debug] ${hits.length} horizontal overflow suspect(s)`,
      hits.slice(0, limit),
    );
  }

  return hits;
}

export type PageOverflowHit = {
  tag: string;
  id: string | null;
  className: string;
  textPreview: string;
  rectLeft: number;
  rectRight: number;
  scrollWidth: number;
  clientWidth: number;
  parentClassName: string;
  reasons: string[];
};

function collectPageOverflowHits(
  root: HTMLElement,
  viewportWidth: number,
): PageOverflowHit[] {
  const hits: PageOverflowHit[] = [];

  const walk = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const reasons: string[] = [];
    if (el.scrollWidth > el.clientWidth + 1) {
      reasons.push("scrollWidth>clientWidth");
    }
    if (rect.left < -1) {
      reasons.push("rect.left<0");
    }
    if (rect.right > viewportWidth + 1) {
      reasons.push("rect.right>viewport");
    }
    if (reasons.length > 0) {
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
      const parent = el.parentElement;
      hits.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: String(el.className).slice(0, 160),
        textPreview: text,
        rectLeft: Math.round(rect.left * 10) / 10,
        rectRight: Math.round(rect.right * 10) / 10,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        parentClassName: parent ? String(parent.className).slice(0, 120) : "",
        reasons,
      });
    }
    for (const child of el.children) {
      if (child instanceof HTMLElement) walk(child);
    }
  };

  walk(root);
  hits.sort((a, b) => b.rectRight - a.rectRight);
  return hits;
}

export type ProfilePageOverflowHit = PageOverflowHit;

/**
 * Development-only: detailed overflow log for public player profile (`/player/[slug]`).
 */
export function logProfilePageOverflowOffenders(
  root: HTMLElement,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0,
): ProfilePageOverflowHit[] {
  if (!isDev || typeof document === "undefined" || viewportWidth <= 0) return [];

  const hits = collectPageOverflowHits(root, viewportWidth);

  if (hits.length > 0) {
    console.warn(
      `[player-profile-overflow] ${hits.length} suspect(s) @ viewport ${viewportWidth}px`,
      hits.slice(0, 25),
    );
  } else {
    console.info(
      `[player-profile-overflow] no overflow suspects @ viewport ${viewportWidth}px`,
    );
  }

  return hits;
}

const SCOUT_APPLY_PROBE_SELECTORS = [
  "html",
  "body",
  "[data-app-root]",
  "[data-app-column]",
  "[data-app-main]",
  "[data-app-main-inner]",
  "[data-app-mobile-header]",
  "[data-app-bottom-nav]",
  "[data-scout-apply-page]",
  "[data-scout-apply-form]",
  ".gn-upload-indeterminate-track",
  ".gn-upload-indeterminate-bar",
] as const;

/**
 * Development-only: detailed overflow log for `/scout-apply` (full tree + shell probes).
 */
export function logScoutApplyPageOverflowOffenders(
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0,
): PageOverflowHit[] {
  if (!isDev || typeof document === "undefined" || viewportWidth <= 0) return [];

  const docEl = document.documentElement;
  const allHits = collectPageOverflowHits(docEl, viewportWidth);

  const probeHits: PageOverflowHit[] = [];
  for (const selector of SCOUT_APPLY_PROBE_SELECTORS) {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLElement)) continue;
    const rect = el.getBoundingClientRect();
    const reasons: string[] = [];
    if (el.scrollWidth > el.clientWidth + 1) {
      reasons.push("scrollWidth>clientWidth");
    }
    if (rect.left < -1) reasons.push("rect.left<0");
    if (rect.right > viewportWidth + 1) reasons.push("rect.right>viewport");
    if (reasons.length === 0) continue;
    probeHits.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className: String(el.className).slice(0, 160),
      textPreview: `[probe ${selector}]`,
      rectLeft: Math.round(rect.left * 10) / 10,
      rectRight: Math.round(rect.right * 10) / 10,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      parentClassName: el.parentElement
        ? String(el.parentElement.className).slice(0, 120)
        : "",
      reasons: [...reasons, `selector:${selector}`],
    });
  }

  const merged = [...probeHits, ...allHits];
  const docScroll = docEl.scrollWidth;
  const canScrollX = docScroll > viewportWidth + 1;

  if (merged.length > 0 || canScrollX) {
    console.warn(
      `[scout-apply-overflow] ${merged.length} suspect(s) @ viewport ${viewportWidth}px` +
        (canScrollX ? ` — document.scrollWidth=${docScroll}` : ""),
      merged.slice(0, 30),
    );
  } else {
    console.info(
      `[scout-apply-overflow] no overflow suspects @ viewport ${viewportWidth}px`,
    );
  }

  return merged;
}

const SCOUT_DASHBOARD_PROBE_SELECTORS = [
  "html",
  "body",
  "[data-app-root]",
  "[data-app-column]",
  "[data-app-main]",
  "[data-app-main-inner]",
  "[data-app-mobile-header]",
  "[data-app-bottom-nav]",
  "[data-scout-dashboard-page]",
  "[data-pitchrusch-feed-card]",
] as const;

/**
 * Development-only: detailed overflow log for `/scout-dashboard`.
 */
export function logScoutDashboardPageOverflowOffenders(
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0,
): PageOverflowHit[] {
  if (!isDev || typeof document === "undefined" || viewportWidth <= 0) return [];

  const docEl = document.documentElement;
  const allHits = collectPageOverflowHits(docEl, viewportWidth);

  const probeHits: PageOverflowHit[] = [];
  for (const selector of SCOUT_DASHBOARD_PROBE_SELECTORS) {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLElement)) continue;
    const rect = el.getBoundingClientRect();
    const reasons: string[] = [];
    if (el.scrollWidth > el.clientWidth + 1) {
      reasons.push("scrollWidth>clientWidth");
    }
    if (rect.left < -1) reasons.push("rect.left<0");
    if (rect.right > viewportWidth + 1) reasons.push("rect.right>viewport");
    if (reasons.length === 0) continue;
    probeHits.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className: String(el.className).slice(0, 160),
      textPreview: `[probe ${selector}]`,
      rectLeft: Math.round(rect.left * 10) / 10,
      rectRight: Math.round(rect.right * 10) / 10,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      parentClassName: el.parentElement
        ? String(el.parentElement.className).slice(0, 120)
        : "",
      reasons: [...reasons, `selector:${selector}`],
    });
  }

  const merged = [...probeHits, ...allHits];
  const docScroll = docEl.scrollWidth;
  const canScrollX = docScroll > viewportWidth + 1;

  if (merged.length > 0 || canScrollX) {
    console.warn(
      `[scout-dashboard-overflow] ${merged.length} suspect(s) @ viewport ${viewportWidth}px` +
        (canScrollX ? ` — document.scrollWidth=${docScroll}` : ""),
      merged.slice(0, 30),
    );
  } else {
    console.info(
      `[scout-dashboard-overflow] no overflow suspects @ viewport ${viewportWidth}px`,
    );
  }

  return merged;
}

const APP_SHELL_PROBE_SELECTORS = [
  "html",
  "body",
  "[data-app-root]",
  "[data-app-column]",
  "[data-app-main]",
  "[data-app-main-inner]",
  "[data-app-mobile-header]",
  "[data-app-bottom-nav]",
  "[data-profile-shell]",
  "[data-messages-inbox]",
  "[data-messages-thread]",
] as const;

/**
 * Development-only: full-document overflow scan for app shell routes (all roles).
 */
export function logAppShellPageOverflowOffenders(
  pathname: string,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0,
): PageOverflowHit[] {
  if (!isDev || typeof document === "undefined" || viewportWidth <= 0) return [];

  const docEl = document.documentElement;
  const allHits = collectPageOverflowHits(docEl, viewportWidth);

  const probeHits: PageOverflowHit[] = [];
  for (const selector of APP_SHELL_PROBE_SELECTORS) {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLElement)) continue;
    const rect = el.getBoundingClientRect();
    const reasons: string[] = [];
    if (el.scrollWidth > el.clientWidth + 1) {
      reasons.push("scrollWidth>clientWidth");
    }
    if (rect.left < -1) reasons.push("rect.left<0");
    if (rect.right > viewportWidth + 1) reasons.push("rect.right>viewport");
    if (reasons.length === 0) continue;
    probeHits.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className: String(el.className).slice(0, 160),
      textPreview: `[probe ${selector}]`,
      rectLeft: Math.round(rect.left * 10) / 10,
      rectRight: Math.round(rect.right * 10) / 10,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      parentClassName: el.parentElement
        ? String(el.parentElement.className).slice(0, 120)
        : "",
      reasons: [...reasons, `selector:${selector}`],
    });
  }

  const merged = [...probeHits, ...allHits];
  const docScroll = docEl.scrollWidth;
  const canScrollX = docScroll > viewportWidth + 1;

  if (merged.length > 0 || canScrollX) {
    console.warn(
      `[app-shell-overflow] ${pathname} — ${merged.length} suspect(s) @ ${viewportWidth}px` +
        (canScrollX ? ` — document.scrollWidth=${docScroll}` : ""),
      merged.slice(0, 30),
    );
  } else {
    console.info(
      `[app-shell-overflow] ${pathname} — no overflow suspects @ ${viewportWidth}px`,
    );
  }

  return merged;
}
