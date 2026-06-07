"use client";

import { useEffect, useState, type ReactNode, type Ref } from "react";
import { isDev } from "@/lib/devLog";

/** Shared card selector — mock and real feed use the same element. */
export const MLV3_HOME_MOCK_CARD_SELECTOR = "[data-mlv3-home-mock-card]";

export type HomeV3FrameRoute = "home-mock" | "home-feed";

export type HomeV3FrameCompareSnapshot = {
  route: HomeV3FrameRoute;
  selector: string;
  cardRectWidth: number | null;
  cardRectHeight: number | null;
  computedWidth: string | null;
  computedHeight: string | null;
  cardTag: string | null;
  cardFound: boolean;
  error?: string;
};

export function readHomeV3FrameCompareSnapshot(
  route: HomeV3FrameRoute,
  activeIndex = 0,
): HomeV3FrameCompareSnapshot {
  const selector = MLV3_HOME_MOCK_CARD_SELECTOR;
  const card =
    document.querySelector<HTMLElement>(
      `[data-mlv3-home-mock-item]:nth-child(${activeIndex + 1}) ${selector}`,
    ) ?? document.querySelector<HTMLElement>(selector);

  if (!card) {
    return {
      route,
      selector,
      cardRectWidth: null,
      cardRectHeight: null,
      computedWidth: null,
      computedHeight: null,
      cardTag: null,
      cardFound: false,
      error: "card not found",
    };
  }

  const rect = card.getBoundingClientRect();
  const style = getComputedStyle(card);
  return {
    route,
    selector,
    cardRectWidth: Math.round(rect.width * 10) / 10,
    cardRectHeight: Math.round(rect.height * 10) / 10,
    computedWidth: style.width,
    computedHeight: style.height,
    cardTag: card.tagName.toLowerCase(),
    cardFound: true,
  };
}

export function logHomeV3FrameCompare(
  route: HomeV3FrameRoute,
  activeIndex = 0,
): void {
  if (!isDev || typeof document === "undefined") return;
  console.info("[Home V3 frame compare]", readHomeV3FrameCompareSnapshot(route, activeIndex));
}

export function HomeV3FrameCompareOverlay({
  route,
  activeIndex = 0,
}: {
  route: HomeV3FrameRoute;
  activeIndex?: number;
}) {
  const [snapshot, setSnapshot] = useState<HomeV3FrameCompareSnapshot | null>(
    null,
  );

  useEffect(() => {
    if (!isDev || typeof window === "undefined") return;

    const update = () => {
      setSnapshot(readHomeV3FrameCompareSnapshot(route, activeIndex));
    };

    update();
    const id = window.setInterval(update, 400);
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true, capture: true });

    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, { capture: true });
    };
  }, [route, activeIndex]);

  if (!isDev || !snapshot) return null;

  return (
    <div
      data-mlv3-frame-compare-overlay
      aria-hidden
      style={{
        position: "fixed",
        left: 8,
        bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))",
        zIndex: 999998,
        boxSizing: "border-box",
        maxWidth: "calc(100% - 16px)",
        borderRadius: 8,
        border: "2px solid rgb(255 255 255 / 0.35)",
        background: "rgb(0 0 0 / 0.88)",
        padding: "8px 10px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 11,
        lineHeight: 1.45,
        color: "#fff",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        pointerEvents: "none",
      }}
    >
      {`[Home V3 frame compare]
route: ${snapshot.route}
selector: ${snapshot.selector}
cardRectWidth: ${snapshot.cardRectWidth ?? "—"}
cardRectHeight: ${snapshot.cardRectHeight ?? "—"}
computedWidth: ${snapshot.computedWidth ?? "—"}
computedHeight: ${snapshot.computedHeight ?? "—"}
cardTag: ${snapshot.cardTag ?? "—"}
cardFound: ${snapshot.cardFound ? "yes" : "no"}${snapshot.error ? `\nerror: ${snapshot.error}` : ""}`}
    </div>
  );
}

export function HomeFeedV3SnapShell({
  scrollRef,
  ariaLabel,
  children,
}: {
  scrollRef?: Ref<HTMLDivElement>;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div data-mlv3-home-mock-feed>
      <div
        ref={scrollRef}
        data-mlv3-home-mock-scroll-root
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>
  );
}

export function HomeFeedV3SnapItems({ children }: { children: ReactNode }) {
  return <ul data-mlv3-home-mock-items>{children}</ul>;
}

export function HomeFeedV3SnapItem({ children }: { children: ReactNode }) {
  return <li data-mlv3-home-mock-item>{children}</li>;
}

export function HomeFeedV3ItemStage({ children }: { children: ReactNode }) {
  return <div data-mlv3-home-mock-item-stage>{children}</div>;
}

/** Identical card wrapper for mock gradients and real video feed. */
export function HomeFeedCardFrameV3({ children }: { children: ReactNode }) {
  return <article data-mlv3-home-mock-card>{children}</article>;
}
