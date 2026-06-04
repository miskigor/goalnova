"use client";

import { useEffect, useRef, type RefObject } from "react";
import { MLV2_ROOT_ATTR } from "@/components/layout/mobile-v2/mobileLayoutStableV2.tokens";
import { isMobileLayoutStableV2Enabled } from "@/lib/layout/mobileLayoutStableV2Flag";

const MOBILE_MAX_WIDTH_PX = 1023;
const SCROLL_FALLBACK_DEBOUNCE_MS = 180;
const POINTER_SNAP_DELAY_MS = 40;
const SNAP_LOCK_MS = 300;
const SWIPE_THRESHOLD_PX = 35;
const SNAP_EPSILON_PX = 2;

type GestureStart = {
  startY: number;
  startScrollTop: number;
  currentIndex: number;
};

function isV2HomeFeedSnapContext(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  if (!isMobileLayoutStableV2Enabled()) return false;
  if (!window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`).matches) return false;
  if (!document.documentElement.hasAttribute(MLV2_ROOT_ATTR)) return false;
  if (!document.querySelector("[data-pitchrusch-home-feed]")) return false;
  return true;
}

function feedItems(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-pitchrusch-feed-item]"),
  );
}

function itemScrollTop(root: HTMLElement, item: HTMLElement): number {
  const rootRect = root.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  return Math.max(0, Math.round(root.scrollTop + (itemRect.top - rootRect.top)));
}

function closestItemIndex(root: HTMLElement, items: HTMLElement[]): number {
  if (items.length === 0) return 0;

  const rootRect = root.getBoundingClientRect();
  let closestIndex = 0;
  let minDist = Infinity;

  items.forEach((item, index) => {
    const dist = Math.abs(item.getBoundingClientRect().top - rootRect.top);
    if (dist < minDist) {
      minDist = dist;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function indexFromScrollTop(root: HTMLElement, items: HTMLElement[]): number {
  if (items.length === 0) return 0;

  const page = root.clientHeight;
  if (page >= 8) {
    return Math.min(
      items.length - 1,
      Math.max(0, Math.round(root.scrollTop / page)),
    );
  }

  return closestItemIndex(root, items);
}

function clampIndex(index: number, itemCount: number): number {
  if (itemCount <= 0) return 0;
  return Math.min(itemCount - 1, Math.max(0, index));
}

function pointerY(event: TouchEvent | PointerEvent): number | null {
  if ("touches" in event) {
    const touch =
      event.type === "touchstart"
        ? event.touches[0]
        : event.changedTouches[0];
    return touch?.clientY ?? null;
  }
  return event.clientY;
}

/**
 * V2 /home only — TikTok-style directional paging on `[data-pitchrusch-feed-scroll-root]`.
 * Does not touch active-video logic.
 */
export function useV2HomeFeedSnapController(
  scrollRef: RefObject<HTMLElement | null>,
  /** Re-bind when feed length changes so new items are included. */
  feedItemCount: number,
): void {
  const isSnappingRef = useRef(false);
  const currentIndexRef = useRef(0);
  const gestureStartRef = useRef<GestureStart | null>(null);
  const hadTouchRef = useRef(false);
  const gestureActiveRef = useRef(false);
  const gestureEndHandledRef = useRef(false);
  const scrollDebounceRef = useRef<number | null>(null);
  const pointerSnapRef = useRef<number | null>(null);
  const snapResetRef = useRef<number | null>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || feedItemCount < 1) return;
    if (!isV2HomeFeedSnapContext()) return;

    const items = () => feedItems(root);

    currentIndexRef.current = indexFromScrollTop(root, items());

    const clearTimers = () => {
      if (scrollDebounceRef.current != null) {
        window.clearTimeout(scrollDebounceRef.current);
        scrollDebounceRef.current = null;
      }
      if (pointerSnapRef.current != null) {
        window.clearTimeout(pointerSnapRef.current);
        pointerSnapRef.current = null;
      }
    };

    const beginSnapLock = () => {
      isSnappingRef.current = true;
      if (snapResetRef.current != null) {
        window.clearTimeout(snapResetRef.current);
      }
      snapResetRef.current = window.setTimeout(() => {
        isSnappingRef.current = false;
        hadTouchRef.current = false;
        snapResetRef.current = null;
      }, SNAP_LOCK_MS);
    };

    const snapToIndex = (targetIndex: number) => {
      if (isSnappingRef.current) return;

      const list = items();
      if (list.length === 0) return;

      const clamped = clampIndex(targetIndex, list.length);
      const targetItem = list[clamped];
      if (!targetItem) return;

      const targetTop = itemScrollTop(root, targetItem);
      if (Math.abs(root.scrollTop - targetTop) < SNAP_EPSILON_PX) {
        currentIndexRef.current = clamped;
        return;
      }

      beginSnapLock();
      currentIndexRef.current = clamped;
      root.scrollTo({ top: targetTop, behavior: "smooth" });
    };

    const snapToClosestFallback = () => {
      if (isSnappingRef.current || hadTouchRef.current) return;

      const list = items();
      if (list.length === 0) return;

      const closest = closestItemIndex(root, list);
      snapToIndex(closest);
    };

    const resolveDirectionalTarget = (start: GestureStart, endY: number): number => {
      const deltaY = start.startY - endY;
      const scrollDelta = root.scrollTop - start.startScrollTop;
      let targetIndex = start.currentIndex;

      if (deltaY > SWIPE_THRESHOLD_PX || scrollDelta > SWIPE_THRESHOLD_PX) {
        targetIndex = start.currentIndex + 1;
      } else if (deltaY < -SWIPE_THRESHOLD_PX || scrollDelta < -SWIPE_THRESHOLD_PX) {
        targetIndex = start.currentIndex - 1;
      }

      return clampIndex(targetIndex, items().length);
    };

    const onGestureStart = (event: TouchEvent | PointerEvent) => {
      if (isSnappingRef.current || gestureActiveRef.current) return;

      const y = pointerY(event);
      if (y == null) return;

      hadTouchRef.current = true;
      gestureActiveRef.current = true;
      gestureEndHandledRef.current = false;

      const list = items();
      const currentIndex = indexFromScrollTop(root, list);
      currentIndexRef.current = currentIndex;

      gestureStartRef.current = {
        startY: y,
        startScrollTop: root.scrollTop,
        currentIndex,
      };

      if (scrollDebounceRef.current != null) {
        window.clearTimeout(scrollDebounceRef.current);
        scrollDebounceRef.current = null;
      }
    };

    const onGestureEnd = (event: TouchEvent | PointerEvent) => {
      if (!gestureActiveRef.current || gestureEndHandledRef.current) return;

      const start = gestureStartRef.current;
      if (!start || isSnappingRef.current) return;

      const endY = pointerY(event);
      if (endY == null) return;

      gestureEndHandledRef.current = true;
      gestureActiveRef.current = false;
      gestureStartRef.current = null;

      if (pointerSnapRef.current != null) {
        window.clearTimeout(pointerSnapRef.current);
      }

      pointerSnapRef.current = window.setTimeout(() => {
        pointerSnapRef.current = null;
        const targetIndex = resolveDirectionalTarget(start, endY);
        snapToIndex(targetIndex);
      }, POINTER_SNAP_DELAY_MS);
    };

    const onScrollFallback = () => {
      if (isSnappingRef.current || hadTouchRef.current) return;

      if (scrollDebounceRef.current != null) {
        window.clearTimeout(scrollDebounceRef.current);
      }

      scrollDebounceRef.current = window.setTimeout(() => {
        scrollDebounceRef.current = null;
        snapToClosestFallback();
      }, SCROLL_FALLBACK_DEBOUNCE_MS);
    };

    const onTouchStart = (event: TouchEvent) => onGestureStart(event);
    const onTouchEnd = (event: TouchEvent) => onGestureEnd(event);
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      onGestureStart(event);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      onGestureEnd(event);
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
    root.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
    root.addEventListener("pointerup", onPointerUp, { passive: true, capture: true });
    root.addEventListener("scroll", onScrollFallback, { passive: true });

    return () => {
      clearTimers();
      if (snapResetRef.current != null) {
        window.clearTimeout(snapResetRef.current);
        snapResetRef.current = null;
      }
      isSnappingRef.current = false;
      hadTouchRef.current = false;
      gestureActiveRef.current = false;
      gestureStartRef.current = null;
      gestureEndHandledRef.current = false;
      root.removeEventListener("touchstart", onTouchStart, { capture: true });
      root.removeEventListener("touchend", onTouchEnd, { capture: true });
      root.removeEventListener("pointerdown", onPointerDown, { capture: true });
      root.removeEventListener("pointerup", onPointerUp, { capture: true });
      root.removeEventListener("scroll", onScrollFallback);
    };
  }, [feedItemCount, scrollRef]);
}
