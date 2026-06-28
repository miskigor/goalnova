import { isHomeFeedMobileViewport } from "@/components/home/homeFeedMobileScrollReset";

/** Mobile snap scrollport; desktop uses layout viewport (document scroll). */
export function resolveHomeFeedIntersectionRoot(el: HTMLElement): Element | null {
  if (!isHomeFeedMobileViewport()) return null;
  return (
    el.closest<HTMLElement>("[data-home-clean-v3-scroll-root]") ??
    el.closest<HTMLElement>("[data-pitchrusch-feed-scroll-root]") ??
    null
  );
}

export function homeFeedIntersectionRootMargin(): string {
  return isHomeFeedMobileViewport() ? "-18% 0px 48% 0px" : "-8% 0px -8% 0px";
}
