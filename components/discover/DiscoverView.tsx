"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { DISCOVER_PAGE_SHELL_CLASS } from "@/lib/layout/appShellClasses";
import { filterPlayerProfiles } from "@/lib/discover/filterPlayerProfiles";
import {
  fetchAllPlayerProfilesForDiscover,
  type PlayerProfileRow,
} from "@/lib/supabase/discoverPlayers";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { PlayerDiscoverCard } from "./PlayerDiscoverCard";

const SEARCH_DEBOUNCE_MS = 320;

function DiscoverSpinner() {
  return (
    <svg
      className="mx-auto h-8 w-8 animate-spin text-gn-accent"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
      />
    </svg>
  );
}

function parseAgeInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function DiscoverView() {
  const t = useTranslations("discover");
  const tSv = useTranslations("scoutVerification");
  const scoutGate = useScoutVerification();
  const discoverLockedForUnverifiedScout =
    scoutGate.loaded && scoutGate.isUnverifiedScout;
  const fetchCompletedOnce = useRef(false);
  const [allRows, setAllRows] = useState<PlayerProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [position, setPosition] = useState("");
  const [preferredFoot, setPreferredFoot] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  const ageMinN = useMemo(() => parseAgeInput(ageMin), [ageMin]);
  const ageMaxN = useMemo(() => parseAgeInput(ageMax), [ageMax]);

  const filteredRows = useMemo(
    () =>
      filterPlayerProfiles(allRows, {
        search: debouncedSearch,
        country,
        city,
        ageMin: ageMinN,
        ageMax: ageMaxN,
        position,
        preferredFoot,
      }),
    [
      allRows,
      debouncedSearch,
      country,
      city,
      ageMinN,
      ageMaxN,
      position,
      preferredFoot,
    ]
  );

  async function loadFromServer() {
    const firstFetch = !fetchCompletedOnce.current;
    if (firstFetch) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setErrorMessage(null);

    const { rows: next, errorMessage: err } =
      await fetchAllPlayerProfilesForDiscover();

    fetchCompletedOnce.current = true;

    if (!err) {
      setAllRows(next);
    } else {
      logFullSupabaseError(
        "[PitchRusch discover] load players",
        new Error(err),
      );
      setErrorMessage(err);
      if (firstFetch) {
        setAllRows([]);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    void loadFromServer();
  }, []);

  const showInitialSpinner = loading && allRows.length === 0 && !errorMessage;

  if (discoverLockedForUnverifiedScout) {
    return (
      <div className={`${DISCOVER_PAGE_SHELL_CLASS} space-y-4 pt-2`}>
        <h1 className="text-2xl font-semibold tracking-tight text-gn-text-primary">
          {tSv("discoverLockedTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-gn-text-secondary">
          {tSv("discoverLockedBody")}
        </p>
        <Link
          href="/scout-apply"
          className={`${GN_PRIMARY_BUTTON_CLASS} inline-flex h-11 items-center justify-center px-6 text-sm`}
        >
          {tSv("applyCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className={DISCOVER_PAGE_SHELL_CLASS}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gn-text-primary">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-gn-text-secondary">{t("subtitle")}</p>
      </header>

      <section
        className="mb-6 box-border w-full min-w-0 max-w-full space-y-3 overflow-x-clip rounded-xl border border-gn-border-subtle bg-gn-surface p-4"
        aria-label={t("filtersAria")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-gn-text-secondary">
              {t("search")}
            </span>
            <input
              suppressHydrationWarning
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg border border-gn-border-subtle bg-gn-bg px-3 py-2 text-sm text-gn-text-primary outline-none ring-gn-accent focus:ring-2"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gn-text-secondary">
              {t("country")}
            </span>
            <input
              suppressHydrationWarning
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={t("countryPlaceholder")}
              className="w-full rounded-lg border border-gn-border-subtle bg-gn-bg px-3 py-2 text-sm text-gn-text-primary outline-none ring-gn-accent focus:ring-2"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gn-text-secondary">
              {t("city")}
            </span>
            <input
              suppressHydrationWarning
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("cityPlaceholder")}
              className="w-full rounded-lg border border-gn-border-subtle bg-gn-bg px-3 py-2 text-sm text-gn-text-primary outline-none ring-gn-accent focus:ring-2"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gn-text-secondary">
              {t("position")}
            </span>
            <input
              suppressHydrationWarning
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={t("positionPlaceholder")}
              className="w-full rounded-lg border border-gn-border-subtle bg-gn-bg px-3 py-2 text-sm text-gn-text-primary outline-none ring-gn-accent focus:ring-2"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gn-text-secondary">
              {t("preferredFoot")}
            </span>
            <input
              suppressHydrationWarning
              type="text"
              value={preferredFoot}
              onChange={(e) => setPreferredFoot(e.target.value)}
              placeholder={t("preferredFootPlaceholder")}
              className="w-full rounded-lg border border-gn-border-subtle bg-gn-bg px-3 py-2 text-sm text-gn-text-primary outline-none ring-gn-accent focus:ring-2"
              autoComplete="off"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-gn-text-secondary">
                {t("ageMin")}
              </span>
              <input
                suppressHydrationWarning
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                placeholder={t("agePlaceholder")}
                className="w-full rounded-lg border border-gn-border-subtle bg-gn-bg px-3 py-2 text-sm text-gn-text-primary outline-none ring-gn-accent focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gn-text-secondary">
                {t("ageMax")}
              </span>
              <input
                suppressHydrationWarning
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                placeholder={t("agePlaceholder")}
                className="w-full rounded-lg border border-gn-border-subtle bg-gn-bg px-3 py-2 text-sm text-gn-text-primary outline-none ring-gn-accent focus:ring-2"
              />
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadFromServer()}
          disabled={loading || refreshing}
          className="w-full rounded-lg border border-gn-border-subtle bg-gn-bg px-4 py-2.5 text-sm font-medium text-gn-text-primary transition-opacity hover:bg-gn-surface disabled:opacity-60 sm:w-auto"
        >
          {refreshing ? t("refreshing") : t("refreshList")}
        </button>
      </section>

      {showInitialSpinner && (
        <div
          className="flex min-h-[14rem] flex-col items-center justify-center gap-3 py-12 text-sm text-gn-text-secondary"
          role="status"
        >
          <DiscoverSpinner />
          {t("loading")}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <p className="font-medium">{t("errorLoadTitle")}</p>
          <p className="mt-1 text-red-100/85">{t("errorLoadBody")}</p>
        </div>
      )}

      {!showInitialSpinner &&
        errorMessage === null &&
        allRows.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-6 py-12 text-center">
            <p className="text-sm font-medium text-gn-text">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm text-gn-text-secondary">{t("emptyBody")}</p>
          </div>
        )}

      {!showInitialSpinner &&
        allRows.length > 0 &&
        filteredRows.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-6 py-12 text-center">
            <p className="text-sm font-medium text-gn-text">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm text-gn-text-secondary">{t("emptyBody")}</p>
          </div>
        )}

      {filteredRows.length > 0 && (
        <ul
          className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${refreshing ? "opacity-70" : ""} transition-opacity`}
        >
          {filteredRows.map((row) => (
            <li key={row.id}>
              <PlayerDiscoverCard row={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
