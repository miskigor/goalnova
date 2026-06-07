"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { isDev } from "@/lib/devLog";

function describeElement(el: Element | null): string | null {
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const data = [
    el.getAttribute("data-mlv2-scroll") != null ? "data-mlv2-scroll" : null,
    el.getAttribute("data-mlv2-bottom-nav") != null ? "data-mlv2-bottom-nav" : null,
    el.getAttribute("data-app-bottom-nav") != null ? "data-app-bottom-nav" : null,
    el.getAttribute("data-scout-shell-page") != null ? "data-scout-shell-page" : null,
    el.getAttribute("data-scout-dashboard-page") != null ? "data-scout-dashboard-page" : null,
    el.getAttribute("data-scout-apply-page") != null ? "data-scout-apply-page" : null,
    el.getAttribute("data-scout-own-profile-page") != null ? "data-scout-own-profile-page" : null,
  ]
    .filter(Boolean)
    .join(",");
  return `${tag}${id}${data ? `[${data}]` : ""}`;
}

function collectOverflowScrollers(): Array<{
  selector: string;
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}> {
  if (typeof document === "undefined") return [];
  const out: Array<{
    selector: string;
    scrollTop: number;
    clientHeight: number;
    scrollHeight: number;
  }> = [];

  const candidates = document.querySelectorAll("*");
  candidates.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const style = getComputedStyle(el);
    const scrollable =
      style.overflowY === "auto" ||
      style.overflowY === "scroll" ||
      style.overflow === "auto" ||
      style.overflow === "scroll";
    if (!scrollable) return;
    if (el.scrollHeight <= el.clientHeight + 1) return;
    out.push({
      selector: describeElement(el) ?? el.tagName,
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    });
  });

  return out.slice(0, 12);
}

function logScoutLayoutDebug(route: string) {
  const bottomNav = document.querySelector("[data-app-bottom-nav]");
  const bottomNavParent = bottomNav?.parentElement ?? null;
  const mlv2Scroll = document.querySelector("[data-mlv2-scroll]");

  console.warn("[Scout layout debug]", {
    route,
    bodyScrollTop: document.body.scrollTop,
    documentScrollTop: document.documentElement.scrollTop,
    mlv2ScrollTop: mlv2Scroll instanceof HTMLElement ? mlv2Scroll.scrollTop : null,
    bottomNavParent: describeElement(bottomNavParent),
    bottomNavPosition:
      bottomNav instanceof HTMLElement ? getComputedStyle(bottomNav).position : null,
    bottomNavWrapperPosition:
      bottomNavParent instanceof HTMLElement
        ? getComputedStyle(bottomNavParent).position
        : null,
    scrollContainers: collectOverflowScrollers(),
  });
}

function clampWindowScroll(): void {
  if (document.documentElement.scrollTop !== 0) {
    document.documentElement.scrollTop = 0;
  }
  if (document.body.scrollTop !== 0) {
    document.body.scrollTop = 0;
  }
  if (window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
}

/**
 * Keeps document/body from scrolling on scout V2 routes; only [data-mlv2-scroll] scrolls.
 */
export function ScoutLayoutScrollLock() {
  const pathname = usePathname() ?? "";

  useLayoutEffect(() => {
    const scroll = document.querySelector("[data-mlv2-scroll]");
    if (!(scroll instanceof HTMLElement)) return;

    scroll.scrollTop = 0;
    scroll.scrollLeft = 0;
    clampWindowScroll();

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (target instanceof Node && scroll.contains(target)) return;
      event.preventDefault();
    };

    const onWindowScroll = () => {
      clampWindowScroll();
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("scroll", onWindowScroll, { passive: true });

    if (isDev) {
      logScoutLayoutDebug(pathname);
      const t = window.setTimeout(() => logScoutLayoutDebug(pathname), 600);
      return () => {
        window.clearTimeout(t);
        document.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("scroll", onWindowScroll);
      };
    }

    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onWindowScroll);
    };
  }, [pathname]);

  return null;
}
