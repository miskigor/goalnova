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
