"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  EMPTY_PLAYER_PROFILE_EXTRA,
  type PlayerProfileExtraFilters,
  type PlayerProfileTextFilterKey,
} from "@/lib/playerProfileSearchFilters";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import type { ExploreSort } from "@/lib/supabase/exploreFeed";

export function PlayerProfileFiltersModal({
  open,
  initial,
  onClose,
  onApply,
  exploreSort,
  onExploreSortChange,
  exploreSortDisabled,
}: {
  open: boolean;
  initial: PlayerProfileExtraFilters;
  onClose: () => void;
  onApply: (next: PlayerProfileExtraFilters) => void;
  exploreSort?: ExploreSort;
  onExploreSortChange?: (sort: ExploreSort) => void;
  exploreSortDisabled?: boolean;
}) {
  const t = useTranslations("search");
  const tFields = useTranslations("profileEditor");
  const te = useTranslations("explore");
  const titleId = useId();
  const [draft, setDraft] = useState<PlayerProfileExtraFilters>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const field = (
    key: PlayerProfileTextFilterKey,
    labelKey: string,
    placeholderKey: string,
  ) => (
    <label className="block min-w-0">
      <span className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
        {t(labelKey)}
      </span>
      <input
        suppressHydrationWarning
        type="text"
        value={draft[key]}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        placeholder={t(placeholderKey)}
        className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-bg px-3 py-2.5 text-sm text-gn-text outline-none focus:border-gn-accent/50 focus:ring-2 focus:ring-gn-accent/20"
        autoComplete="off"
      />
    </label>
  );

  const modal = (
    <div
      className="fixed inset-0 z-[100] box-border flex items-end justify-center overflow-x-clip bg-black/75 px-[max(1rem,env(safe-area-inset-left,0px))] pb-[calc(var(--gn-app-bottom-nav-offset,4.5rem)+max(0.75rem,env(safe-area-inset-bottom,0px)))] pe-[max(1rem,env(safe-area-inset-right,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-sm sm:items-center sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="box-border max-h-[min(calc(100dvh-var(--gn-app-bottom-nav-offset,4.5rem)-2.5rem),40rem)] w-full min-w-0 max-w-lg overflow-x-clip overflow-y-auto overscroll-y-contain scroll-pb-6 rounded-t-2xl border border-gn-border-subtle bg-gn-surface p-4 shadow-2xl [-webkit-overflow-scrolling:touch] sm:max-h-[min(88dvh,40rem)] sm:rounded-2xl sm:p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-gn-text">
          {t("detailedTitle")}
        </h2>
        <p className="mt-1 text-sm text-gn-text-secondary">{t("detailedSubtitle")}</p>

        <div className="mt-5 grid min-w-0 gap-4 pb-6 sm:grid-cols-2">
          {field("position", "fieldPosition", "positionPlaceholder")}
          {field("country", "fieldCountry", "countryPlaceholder")}
          {field("city", "fieldCity", "cityPlaceholder")}
          {field("preferredFoot", "fieldPreferredFoot", "preferredFootPlaceholder")}
          {field("club", "fieldClub", "clubPlaceholder")}
          <label className="block min-w-0 sm:col-span-1">
            <span className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
              {t("fieldAgeMin")}
            </span>
            <input
              suppressHydrationWarning
              type="text"
              inputMode="numeric"
              value={draft.ageMinStr}
              onChange={(e) =>
                setDraft((d) => ({ ...d, ageMinStr: e.target.value }))
              }
              placeholder={t("agePlaceholder")}
              className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-bg px-3 py-2.5 text-sm text-gn-text outline-none focus:border-gn-accent/50 focus:ring-2 focus:ring-gn-accent/20"
              autoComplete="off"
            />
          </label>
          <label className="block min-w-0 sm:col-span-1">
            <span className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
              {t("fieldAgeMax")}
            </span>
            <input
              suppressHydrationWarning
              type="text"
              inputMode="numeric"
              value={draft.ageMaxStr}
              onChange={(e) =>
                setDraft((d) => ({ ...d, ageMaxStr: e.target.value }))
              }
              placeholder={t("agePlaceholder")}
              className="mt-1.5 w-full rounded-xl border border-gn-border bg-gn-bg px-3 py-2.5 text-sm text-gn-text outline-none focus:border-gn-accent/50 focus:ring-2 focus:ring-gn-accent/20"
              autoComplete="off"
            />
          </label>
          <label className="flex min-w-0 items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.availableForTrials}
              onChange={(e) =>
                setDraft((d) => ({ ...d, availableForTrials: e.target.checked }))
              }
              className="size-4 accent-gn-accent"
            />
            <span className="text-sm text-gn-text">{tFields("availableForTrials")}</span>
          </label>
          <label className="flex min-w-0 items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.lookingForClub}
              onChange={(e) =>
                setDraft((d) => ({ ...d, lookingForClub: e.target.checked }))
              }
              className="size-4 accent-gn-accent"
            />
            <span className="text-sm text-gn-text">{tFields("lookingForClub")}</span>
          </label>
        </div>

        {onExploreSortChange != null && exploreSort != null ? (
          <fieldset className="mt-6 border-t border-gn-border-subtle pt-4">
            <legend className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
              {te("sort")}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={exploreSortDisabled}
                onClick={() => onExploreSortChange("newest")}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  exploreSort === "newest"
                    ? "bg-gn-accent text-black"
                    : "border border-gn-border-subtle bg-gn-bg text-gn-text-secondary hover:border-gn-accent/30"
                }`}
              >
                {te("newest")}
              </button>
              <button
                type="button"
                disabled={exploreSortDisabled}
                onClick={() => onExploreSortChange("most_liked")}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  exploreSort === "most_liked"
                    ? "bg-gn-accent text-black"
                    : "border border-gn-border-subtle bg-gn-bg text-gn-text-secondary hover:border-gn-accent/30"
                }`}
              >
                {te("mostLiked")}
              </button>
              <button
                type="button"
                disabled={exploreSortDisabled}
                onClick={() => onExploreSortChange("leaderboard")}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  exploreSort === "leaderboard"
                    ? "bg-gn-accent text-black"
                    : "border border-gn-border-subtle bg-gn-bg text-gn-text-secondary hover:border-gn-accent/30"
                }`}
              >
                {te("highestAi")}
              </button>
            </div>
          </fieldset>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-gn-border-subtle pt-4 pb-2">
          <button
            type="button"
            className={`${GN_PRIMARY_BUTTON_CLASS} min-h-[2.75rem] px-5`}
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {t("applyDetailed")}
          </button>
          <button
            type="button"
            className="min-h-[2.75rem] rounded-xl border border-gn-border-subtle bg-gn-bg px-4 py-2 text-sm font-semibold text-gn-text-secondary hover:border-gn-accent/30 hover:text-gn-text"
            onClick={() => {
              setDraft({ ...EMPTY_PLAYER_PROFILE_EXTRA });
              onApply({ ...EMPTY_PLAYER_PROFILE_EXTRA });
              onExploreSortChange?.("newest");
              onClose();
            }}
          >
            {t("resetDetailed")}
          </button>
          <button
            type="button"
            className="min-h-[2.75rem] rounded-xl px-4 py-2 text-sm font-medium text-gn-text-tertiary hover:text-gn-text"
            onClick={onClose}
          >
            {t("cancelDetailed")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
