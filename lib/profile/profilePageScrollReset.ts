import { resetMlv2ScrollPosition } from "@/lib/layout/mlv2ScrollReset";

const PROFILE_SCROLL_RESET_DELAYS_MS = [100, 300, 600, 1000] as const;

function resetAppMainScroll(): void {
  if (typeof document === "undefined") return;
  const main = document.querySelector("[data-app-main]");
  if (!(main instanceof HTMLElement)) return;
  main.scrollTop = 0;
  main.scrollLeft = 0;
}

/** Reset profile scrollport(s) so avatar/name render at the top of the content area. */
export function resetProfilePageScroll(pathname = ""): void {
  resetMlv2ScrollPosition(pathname);
  resetAppMainScroll();
}

/**
 * Aggressive profile scroll reset — immediate, rAF, and delayed passes after async
 * profile hydration can shift layout height.
 */
export function scheduleProfilePageScrollReset(pathname = ""): () => void {
  const timeoutIds: number[] = [];
  let rafId: number | null = null;

  const doReset = () => {
    resetProfilePageScroll(pathname);
  };

  doReset();
  rafId = window.requestAnimationFrame(doReset);
  for (const ms of PROFILE_SCROLL_RESET_DELAYS_MS) {
    timeoutIds.push(window.setTimeout(doReset, ms));
  }

  return () => {
    if (rafId != null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    for (const id of timeoutIds) {
      window.clearTimeout(id);
    }
  };
}
