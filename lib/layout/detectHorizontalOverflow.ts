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

export type ProfilePageOverflowHit = {
  tag: string;
  className: string;
  textPreview: string;
  rectLeft: number;
  rectRight: number;
  scrollWidth: number;
  clientWidth: number;
  reasons: string[];
};

/**
 * Development-only: detailed overflow log for public player profile (`/player/[slug]`).
 * Not used in production builds (`isDev` is false).
 */
export function logProfilePageOverflowOffenders(
  root: HTMLElement,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0,
): ProfilePageOverflowHit[] {
  if (!isDev || typeof document === "undefined" || viewportWidth <= 0) return [];

  const hits: ProfilePageOverflowHit[] = [];

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
      hits.push({
        tag: el.tagName.toLowerCase(),
        className: String(el.className).slice(0, 160),
        textPreview: text,
        rectLeft: Math.round(rect.left * 10) / 10,
        rectRight: Math.round(rect.right * 10) / 10,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        reasons,
      });
    }
    for (const child of el.children) {
      if (child instanceof HTMLElement) walk(child);
    }
  };

  walk(root);

  hits.sort((a, b) => b.rectRight - a.rectRight);

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
