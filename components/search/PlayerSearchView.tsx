"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  searchPlayersWithFilters,
  type SearchPlayerRow,
} from "@/lib/supabase/searchPlayers";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import {
  EMPTY_PLAYER_PROFILE_EXTRA,
  parseAgeInput,
  type PlayerProfileExtraFilters,
} from "@/lib/playerProfileSearchFilters";
import { PlayerProfileFiltersModal } from "@/components/search/PlayerProfileFiltersModal";

const DEBOUNCE_MS = 300;

export function PlayerSearchView() {
  const t = useTranslations("search");

  const [nameInput, setNameInput] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [extraFilters, setExtraFilters] = useState<PlayerProfileExtraFilters>({
    ...EMPTY_PLAYER_PROFILE_EXTRA,
  });
  const [modalOpen, setModalOpen] = useState(false);

  const [rows, setRows] = useState<SearchPlayerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedName(nameInput.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [nameInput]);

  useEffect(() => {
    const q = debouncedName.trim();
    const hasExtra =
      extraFilters.position.trim() ||
      extraFilters.country.trim() ||
      extraFilters.city.trim() ||
      extraFilters.ageMinStr.trim() ||
      extraFilters.ageMaxStr.trim() ||
      extraFilters.preferredFoot.trim() ||
      extraFilters.club.trim();

    if (!q && !hasExtra) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const rid = ++requestId.current;
    setLoading(true);
    setError(null);

    const ageMin = parseAgeInput(extraFilters.ageMinStr);
    const ageMax = parseAgeInput(extraFilters.ageMaxStr);

    void (async () => {
      const { rows: next, error: err } = await searchPlayersWithFilters({
        q: debouncedName,
        position: extraFilters.position,
        country: extraFilters.country,
        city: extraFilters.city,
        ageMin,
        ageMax,
        preferredFoot: extraFilters.preferredFoot,
        club: extraFilters.club,
      });
      if (cancelled || rid !== requestId.current) return;
      if (err) {
        logFullSupabaseError("[PlayerSearchView] searchPlayersWithFilters", new Error(err));
        setError("1");
        setRows([]);
      } else {
        setRows(next);
        setError(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedName, extraFilters]);

  const showEmptyNoResults =
    (debouncedName.length > 0 || Object.values(extraFilters).some((v) => v.trim())) &&
    !loading &&
    !error &&
    rows.length === 0;

  const showHint =
    debouncedName.length === 0 &&
    !Object.values(extraFilters).some((v) => v.trim()) &&
    !loading;

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg space-y-6 overflow-x-clip sm:max-w-xl">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-gn-text sm:text-2xl lg:text-3xl">
          {t("title")}
        </h1>
        <p className="text-sm text-gn-text-secondary">{t("subtitle")}</p>
      </header>

      <div className="space-y-3">
        <label htmlFor="player-search-name" className="block text-sm font-medium text-gn-text">
          {t("nameLabel")}
        </label>
        <div className="relative">
          <input
            suppressHydrationWarning
            id="player-search-name"
            type="search"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={t("namePlaceholder")}
            autoComplete="off"
            className="w-full rounded-2xl border border-gn-border-subtle bg-gn-surface/50 py-3.5 pe-4 ps-11 text-base text-gn-text shadow-inner outline-none ring-gn-accent/20 placeholder:text-gn-text-tertiary focus:border-gn-accent/45 focus:ring-2"
          />
          <span
            className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-gn-text-tertiary"
            aria-hidden
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="size-5"
            >
              <circle cx="11" cy="11" r="7.25" />
              <path d="M16.65 16.65 21 21" />
            </svg>
          </span>
          {loading ? (
            <span
              className="absolute end-3.5 top-1/2 size-5 -translate-y-1/2 animate-spin rounded-full border-2 border-gn-accent border-t-transparent"
              aria-hidden
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full rounded-xl border border-gn-border-subtle bg-gn-surface/40 py-3 text-sm font-semibold text-gn-text transition-colors hover:border-gn-accent/40 hover:bg-gn-surface-elevated/50 sm:w-auto sm:px-5"
        >
          {t("openDetailedSearch")}
        </button>
      </div>

      <PlayerProfileFiltersModal
        open={modalOpen}
        initial={extraFilters}
        onClose={() => setModalOpen(false)}
        onApply={(next) => setExtraFilters(next)}
      />

      {error ? (
        <p
          className="rounded-xl border border-red-500/35 bg-red-950/20 px-4 py-3 text-sm text-red-100/90"
          role="alert"
        >
          {t("errorBody")}
        </p>
      ) : null}

      {showHint ? (
        <p className="text-center text-sm text-gn-text-tertiary">{t("hint")}</p>
      ) : null}

      {showEmptyNoResults ? (
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-6 py-14 text-center sm:px-10">
          <p className="text-sm font-medium text-gn-text">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-gn-text-secondary">{t("emptyBody")}</p>
          <Link
            href="/discover"
            className={`${GN_PRIMARY_BUTTON_CLASS} mt-6 inline-flex justify-center`}
          >
            {t("discoverCta")}
          </Link>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const slug = row.username?.trim() || row.id;
            const name = row.full_name?.trim() || row.username?.trim() || t("unknownName");
            const user = row.username?.trim() ? `@${row.username.trim()}` : t("noUsername");
            const avatar = row.avatar_url?.trim() || undefined;
            return (
              <li key={row.id}>
                <Link
                  href={`/player/${encodeURIComponent(slug)}`}
                  className="flex items-start gap-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-3 transition-colors hover:border-gn-accent/35 hover:bg-gn-surface-elevated/50"
                >
                  <ProfileAvatar
                    name={name}
                    imageUrl={avatar}
                    sizeClassName="h-12 w-12 shrink-0 text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block text-base font-semibold leading-tight text-gn-text">
                      {name}
                    </span>
                    <span className="mt-0.5 block text-sm text-gn-accent">{user}</span>
                    {row.position?.trim() ? (
                      <span className="mt-1 block text-xs text-gn-text-tertiary">
                        {row.position.trim()}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
