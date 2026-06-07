"use client";

import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import { usePathname } from "@/i18n/navigation";
import { isDev } from "@/lib/devLog";

type ScrollContainerSnapshot = {
  selector: string;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

function readScrollContainers(): ScrollContainerSnapshot[] {
  const out: ScrollContainerSnapshot[] = [];
  const mlv2 = document.querySelector("[data-mlv2-scroll]");
  if (mlv2 instanceof HTMLElement) {
    out.push({
      selector: "data-mlv2-scroll",
      scrollTop: mlv2.scrollTop,
      scrollHeight: mlv2.scrollHeight,
      clientHeight: mlv2.clientHeight,
    });
  }
  const doc = document.documentElement;
  if (doc.scrollHeight > doc.clientHeight + 1) {
    out.push({
      selector: "documentElement",
      scrollTop: doc.scrollTop,
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight,
    });
  }
  if (document.body.scrollHeight > document.body.clientHeight + 1) {
    out.push({
      selector: "body",
      scrollTop: document.body.scrollTop,
      scrollHeight: document.body.scrollHeight,
      clientHeight: document.body.clientHeight,
    });
  }
  return out;
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

function logScoutMobileLayoutCheck(
  pathname: string,
  lastBottomNavTopRef: MutableRefObject<number | null>,
  bottomNavMovedRef: MutableRefObject<boolean>,
): void {
  const mlv2Scroll = document.querySelector("[data-mlv2-scroll]");
  const bottomNav = document.querySelector("[data-app-bottom-nav]");
  const navTop =
    bottomNav instanceof HTMLElement ? bottomNav.getBoundingClientRect().top : null;

  if (
    lastBottomNavTopRef.current != null &&
    navTop != null &&
    Math.abs(navTop - lastBottomNavTopRef.current) > 2
  ) {
    bottomNavMovedRef.current = true;
  }
  if (navTop != null) {
    lastBottomNavTopRef.current = navTop;
  }

  console.warn("[Scout mobile layout check]", {
    pathname,
    bodyScrollTop: document.body.scrollTop,
    docScrollTop: document.documentElement.scrollTop,
    mlv2ScrollTop: mlv2Scroll instanceof HTMLElement ? mlv2Scroll.scrollTop : null,
    scrollWidth: mlv2Scroll instanceof HTMLElement ? mlv2Scroll.scrollWidth : null,
    clientWidth: mlv2Scroll instanceof HTMLElement ? mlv2Scroll.clientWidth : null,
    bottomNavMoves: bottomNavMovedRef.current,
    scrollContainers: readScrollContainers(),
  });
}

/**
 * Dev layout probe + scroll guard for scout tab routes without `data-scout-shell-page`
 * (e.g. /notifications). Dashboard/apply/profile already use ScoutLayoutScrollLock.
 */
export function ScoutMobileLayoutCheck() {
  const pathname = usePathname() ?? "";
  const lastBottomNavTopRef = useRef<number | null>(null);
  const bottomNavMovedRef = useRef(false);

  useLayoutEffect(() => {
    const scroll = document.querySelector("[data-mlv2-scroll]");
    if (!(scroll instanceof HTMLElement)) return;

    const hasScoutShell = Boolean(document.querySelector("[data-scout-shell-page]"));

    scroll.scrollTop = 0;
    scroll.scrollLeft = 0;
    clampWindowScroll();

    const onTouchMove = (event: TouchEvent) => {
      if (hasScoutShell) return;
      const target = event.target;
      if (target instanceof Node && scroll.contains(target)) return;
      event.preventDefault();
    };

    const onWindowScroll = () => {
      if (!hasScoutShell) clampWindowScroll();
    };

    const log = () => {
      if (!isDev) return;
      logScoutMobileLayoutCheck(pathname, lastBottomNavTopRef, bottomNavMovedRef);
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    scroll.addEventListener("scroll", log, { passive: true });

    log();
    const intervalId = isDev ? window.setInterval(log, 4000) : undefined;

    return () => {
      if (intervalId != null) window.clearInterval(intervalId);
      document.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onWindowScroll);
      scroll.removeEventListener("scroll", log);
    };
  }, [pathname]);

  return null;
}
