"use client";

import { useCallback, useRef, useState } from "react";
import { PremiumPlanCard, type PremiumPlanCardModel } from "@/components/premium/PremiumPlanCard";
import type { PaidSubscriptionPlan } from "@/lib/stripe/plans";

type PremiumScoutCarouselProps = {
  cards: PremiumPlanCardModel[];
  busyPlan: PaidSubscriptionPlan | null;
  onCheckout: (plan: PaidSubscriptionPlan) => void;
};

export function PremiumScoutCarousel({ cards, busyPlan, onCheckout }: PremiumScoutCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncActiveIndex = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || cards.length === 0) return;
    const slide = el.querySelector<HTMLElement>("[data-premium-slide]");
    const slideWidth = slide?.offsetWidth ?? el.clientWidth;
    if (slideWidth <= 0) return;
    const gap = 12;
    const index = Math.round(el.scrollLeft / (slideWidth + gap));
    setActiveIndex(Math.min(Math.max(index, 0), cards.length - 1));
  }, [cards.length]);

  const scrollToIndex = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const slide = el.querySelector<HTMLElement>("[data-premium-slide]");
    const slideWidth = slide?.offsetWidth ?? el.clientWidth;
    const gap = 12;
    el.scrollTo({ left: index * (slideWidth + gap), behavior: "smooth" });
    setActiveIndex(index);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        onScroll={syncActiveIndex}
        className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
      >
        {cards.map((card, index) => (
          <div
            key={card.key}
            data-premium-slide
            className="box-border w-[min(100%,22rem)] shrink-0 snap-center snap-always"
            aria-hidden={index !== activeIndex}
          >
            <PremiumPlanCard
              card={card}
              compact
              highlighted={Boolean(card.paidPlan)}
              busyPlan={busyPlan}
              onCheckout={onCheckout}
            />
          </div>
        ))}
      </div>
      {cards.length > 1 ? (
        <div className="flex shrink-0 justify-center gap-1.5 pt-2" role="tablist" aria-label="Plans">
          {cards.map((card, index) => (
            <button
              key={card.key}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={card.key}
              onClick={() => scrollToIndex(index)}
              className={[
                "h-1.5 rounded-full transition-[width,background-color]",
                index === activeIndex ? "w-5 bg-gn-accent" : "w-1.5 bg-white/25",
              ].join(" ")}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
