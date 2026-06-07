"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import "@/components/home/v3/mobileLayoutV3HomeMock.css";
import {
  applyHomeMockMetrics,
  resetHomeMockV3HorizontalScroll,
  useMobileShellV3HomeMockMetrics,
} from "@/hooks/useMobileShellV3HomeMetrics";
import { isDev } from "@/lib/devLog";
import {
  isMobileLayoutV3Enabled,
  isMobileLayoutV3HomeMockRoute,
} from "@/lib/layout/mobileLayoutV3Flag";

const MOCK_CARDS = [
  { id: "mock-1", label: "Mock 1 / 6", from: "#1e3a5f", to: "#0f172a" },
  { id: "mock-2", label: "Mock 2 / 6", from: "#4c1d95", to: "#1e1b4b" },
  { id: "mock-3", label: "Mock 3 / 6", from: "#7c2d12", to: "#431407" },
  { id: "mock-4", label: "Mock 4 / 6", from: "#14532d", to: "#052e16" },
  { id: "mock-5", label: "Mock 5 / 6", from: "#713f12", to: "#422006" },
  { id: "mock-6", label: "Mock 6 / 6", from: "#831843", to: "#500724" },
] as const;

type MockOffender = {
  tag: string;
  dataAttrs: string;
  className: string;
  rectLeft: number;
  rectRight: number;
  rectWidth: number;
  scrollWidth: number;
  clientWidth: number;
};

type RectSnapshot = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

function snapRect(rect: DOMRect): RectSnapshot {
  return {
    left: Math.round(rect.left * 10) / 10,
    right: Math.round(rect.right * 10) / 10,
    top: Math.round(rect.top * 10) / 10,
    bottom: Math.round(rect.bottom * 10) / 10,
    width: Math.round(rect.width * 10) / 10,
    height: Math.round(rect.height * 10) / 10,
  };
}

function formatDataAttrs(el: HTMLElement): string {
  return Object.entries(el.dataset)
    .map(([key, value]) => `data-${key}="${value ?? ""}"`)
    .join(" ");
}

function collectMockOffenders(
  viewportWidth: number,
  limit = 20,
): MockOffender[] {
  const hits: MockOffender[] = [];
  const roots: HTMLElement[] = [];
  const rootEl = document.querySelector<HTMLElement>("[data-mlv3-root]");
  if (rootEl) roots.push(rootEl);
  roots.push(document.body);

  const walk = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const widerThanBox = el.scrollWidth > el.clientWidth + 1;
    const bleedsLeft = rect.left < -1;
    const bleedsRight = rect.right > viewportWidth + 1;

    if (widerThanBox || bleedsLeft || bleedsRight) {
      hits.push({
        tag: el.tagName.toLowerCase(),
        dataAttrs: formatDataAttrs(el).slice(0, 200),
        className: String(el.className).slice(0, 160),
        rectLeft: Math.round(rect.left * 10) / 10,
        rectRight: Math.round(rect.right * 10) / 10,
        rectWidth: Math.round(rect.width * 10) / 10,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
    }

    for (const child of el.children) {
      if (child instanceof HTMLElement) walk(child);
    }
  };

  for (const root of roots) walk(root);

  const seen = new Set<string>();
  const unique = hits.filter((hit) => {
    const key = `${hit.tag}|${hit.dataAttrs}|${hit.rectLeft}|${hit.rectRight}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => b.rectRight - a.rectRight);
  return unique.slice(0, limit);
}

function logHomeMockMetrics(activeIndex: number): void {
  if (!isDev || typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const mainEl = document.querySelector<HTMLElement>(
    '[data-mlv3-main][data-mlv3-route="home-mock"]',
  );
  const rootEl = document.querySelector<HTMLElement>("[data-mlv3-root]");
  const scrollRootEl = document.querySelector<HTMLElement>(
    "[data-mlv3-home-mock-scroll-root]",
  );
  const cardEl = document.querySelector<HTMLElement>(
    "[data-mlv3-home-mock-card]",
  );
  const bottomNavEl = document.querySelector<HTMLElement>(
    "[data-mlv3-bottom-nav]",
  );
  const docEl = document.documentElement;
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const metrics = mainEl ? applyHomeMockMetrics(mainEl) : null;

  const offenders = collectMockOffenders(viewportWidth);

  const payload = {
    docScrollWidth: docEl.scrollWidth,
    docClientWidth: docEl.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    rootScrollWidth: rootEl?.scrollWidth ?? 0,
    mainScrollWidth: mainEl?.scrollWidth ?? 0,
    scrollRootScrollWidth: scrollRootEl?.scrollWidth ?? 0,
    mainHeight: metrics?.mainHeight ?? 0,
    availableHeight: metrics?.availableHeight ?? 0,
    topGap: metrics?.topGap ?? 0,
    bottomGap: metrics?.bottomGap ?? 0,
    cardTargetWidth: metrics?.cardTargetWidth ?? 0,
    cardTargetHeight: metrics?.cardTargetHeight ?? 0,
    cardWidth: metrics?.cardWidth ?? 0,
    cardHeight: metrics?.cardHeight ?? 0,
    cardRect: cardEl ? snapRect(cardEl.getBoundingClientRect()) : null,
    bottomNavRect: bottomNavEl
      ? snapRect(bottomNavEl.getBoundingClientRect())
      : null,
    activeIndex,
    offenders,
  };

  const hasOverflow =
    docEl.scrollWidth > docEl.clientWidth + 1 ||
    document.body.scrollWidth > docEl.clientWidth + 1 ||
    offenders.length > 0;

  if (hasOverflow) {
    console.warn("[Home V3 mock metrics]", payload);
  } else {
    console.info("[Home V3 mock metrics]", payload);
  }
}

function MockCard({
  label,
  from,
  to,
}: {
  label: string;
  from: string;
  to: string;
}) {
  return (
    <article data-mlv3-home-mock-card>
      <div
        data-mlv3-home-mock-card-bg
        style={{
          background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
        }}
        aria-hidden
      />
      <span data-mlv3-home-mock-label>{label}</span>
      <div data-mlv3-home-mock-rail aria-hidden>
        <button type="button" tabIndex={-1}>
          ♡
        </button>
        <button type="button" tabIndex={-1}>
          💬
        </button>
        <button type="button" tabIndex={-1}>
          ↗
        </button>
      </div>
      <div data-mlv3-home-mock-meta>
        <p className="text-[13px] font-semibold text-white">Mock Player</p>
        <p className="text-[11px] text-white/75">@mockplayer</p>
        <p className="mt-1 text-[12px] text-white/88">Placeholder caption inside card</p>
      </div>
    </article>
  );
}

export function HomeFeedMockV3() {
  const pathname = usePathname();
  const enabled = isMobileLayoutV3Enabled();
  const onMockRoute = isMobileLayoutV3HomeMockRoute(pathname);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useMobileShellV3HomeMockMetrics(enabled && onMockRoute);

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = el.clientHeight;
    if (h <= 0) return;
    const index = Math.max(
      0,
      Math.min(MOCK_CARDS.length - 1, Math.round(el.scrollTop / h)),
    );
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    if (!onMockRoute) return;
    resetHomeMockV3HorizontalScroll();
    logHomeMockMetrics(0);
    const id = window.requestAnimationFrame(() => {
      resetHomeMockV3HorizontalScroll();
      logHomeMockMetrics(0);
    });
    return () => window.cancelAnimationFrame(id);
  }, [onMockRoute]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      if (el.scrollLeft !== 0) el.scrollLeft = 0;
      updateActiveIndex();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [updateActiveIndex]);

  useEffect(() => {
    logHomeMockMetrics(activeIndex);
  }, [activeIndex]);

  if (!enabled) {
    return (
      <div className="space-y-4 py-6 text-sm text-gn-text-secondary">
        <h1 className="text-lg font-semibold text-gn-text">Home V3 mock</h1>
        <p>
          Flag is <strong className="text-gn-text">off</strong>. Add to{" "}
          <code className="rounded bg-white/10 px-1 py-0.5 text-gn-text">.env.local</code>:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-gn-border-subtle bg-black/30 p-3 text-xs text-gn-text">
          NEXT_PUBLIC_MOBILE_LAYOUT_V3=true
        </pre>
      </div>
    );
  }

  if (!onMockRoute) {
    return (
      <p className="py-6 text-sm text-gn-text-secondary">
        Open{" "}
        <Link
          href="/debug/mobile-layout-v3/home-mock"
          className="text-gn-accent underline"
        >
          /debug/mobile-layout-v3/home-mock
        </Link>
      </p>
    );
  }

  return (
    <div data-mlv3-home-mock-feed>
      <div
        ref={scrollRef}
        data-mlv3-home-mock-scroll-root
        aria-label="Mock home feed"
      >
        <ul data-mlv3-home-mock-items>
          {MOCK_CARDS.map((card) => (
            <li key={card.id} data-mlv3-home-mock-item>
              <div data-mlv3-home-mock-item-stage>
                <MockCard label={card.label} from={card.from} to={card.to} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
