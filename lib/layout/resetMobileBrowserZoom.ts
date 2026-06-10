import { resetAppShellHorizontalScroll } from "@/lib/feed/feedScrollContract";

/**
 * iOS Safari auto-zooms focused inputs with font-size < 16px and may keep that zoom
 * after navigation. Blur + viewport nudge + horizontal scroll reset.
 */
export function resetMobileBrowserZoom(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }

  resetAppShellHorizontalScroll();

  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;

  const original = meta.getAttribute("content") ?? "";
  if (!original.includes("width=device-width")) return;

  meta.setAttribute("content", `${original}, maximum-scale=1`);
  requestAnimationFrame(() => {
    meta.setAttribute("content", original);
    window.scrollTo({ left: 0, top: window.scrollY, behavior: "auto" });
  });
}
