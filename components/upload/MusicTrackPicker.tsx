"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import {
  fetchActiveMusicTracks,
  formatTrackDuration,
  type MusicTrackRow,
} from "@/lib/supabase/musicTracks";

type Props = {
  value: string | null;
  onChange: (trackId: string | null, track?: MusicTrackRow | null) => void;
  disabled?: boolean;
};

function uniqSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.map((v) => (v ?? "").trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

export function MusicTrackPicker({ value, onChange, disabled }: Props) {
  const t = useTranslations("music");
  const [tracks, setTracks] = useState<MusicTrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [moodFilter, setMoodFilter] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { tracks: next, error } = await fetchActiveMusicTracks(supabase);
      if (cancelled) return;
      if (error) setLoadError(error);
      setTracks(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const genres = useMemo(() => uniqSorted(tracks.map((x) => x.genre)), [tracks]);
  const moods = useMemo(() => uniqSorted(tracks.map((x) => x.mood)), [tracks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const g = genreFilter.trim().toLowerCase();
    const m = moodFilter.trim().toLowerCase();
    return tracks.filter((tr) => {
      if (g && (tr.genre ?? "").toLowerCase() !== g) return false;
      if (m && (tr.mood ?? "").toLowerCase() !== m) return false;
      if (!q) return true;
      const blob = `${tr.title} ${tr.artist} ${tr.genre ?? ""} ${tr.mood ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [tracks, search, genreFilter, moodFilter]);

  const stopPreview = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPlayingId(null);
  }, []);

  const togglePreview = useCallback(
    (track: MusicTrackRow) => {
      if (disabled) return;
      const a = audioRef.current;
      if (!a) return;
      if (playingId === track.id) {
        stopPreview();
        return;
      }
      stopPreview();
      a.src = track.audio_url;
      void a
        .play()
        .then(() => setPlayingId(track.id))
        .catch(() => setPlayingId(null));
    },
    [disabled, playingId, stopPreview],
  );

  useEffect(() => {
    return () => stopPreview();
  }, [stopPreview]);

  const statusLine = useMemo(() => {
    if (loading) return t("loadingLibrary");
    if (loadError) return t("loadFailed");
    if (tracks.length === 0) return t("libraryEmpty");
    return t("libraryHint");
  }, [loading, loadError, tracks.length, t]);

  return (
    <section
      className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-neutral-950/90 to-black/80 p-4 shadow-[0_0_0_1px_rgba(249,115,22,0.06)] ring-1 ring-white/[0.04]"
      aria-labelledby="gn-music-picker-heading"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            id="gn-music-picker-heading"
            className="text-sm font-semibold tracking-tight text-white"
          >
            {t("addMusic")}
          </h2>
          <p className="mt-0.5 text-xs text-white/45">{statusLine}</p>
        </div>
      </div>

      <audio ref={audioRef} className="hidden" preload="none" playsInline />

      {!loading && !loadError && tracks.length > 0 ? (
        <div className="mb-3 space-y-2">
          <input
            suppressHydrationWarning
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-gn-accent/50 focus:ring-1 focus:ring-gn-accent/30"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-white/40">
                {t("genre")}
              </span>
              <select
                suppressHydrationWarning
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                disabled={disabled}
                className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-gn-accent/50"
              >
                <option value="">{t("filterAny")}</option>
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-white/40">
                {t("mood")}
              </span>
              <select
                suppressHydrationWarning
                value={moodFilter}
                onChange={(e) => setMoodFilter(e.target.value)}
                disabled={disabled}
                className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-gn-accent/50"
              >
                <option value="">{t("filterAny")}</option>
                {moods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null, null)}
          className={[
            "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
            value === null
              ? "border-gn-accent/55 bg-gn-accent/[0.12] ring-1 ring-gn-accent/25"
              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
          ].join(" ")}
        >
          <span
            className={[
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
              value === null ? "border-gn-accent bg-gn-accent/20" : "border-white/25",
            ].join(" ")}
            aria-hidden
          >
            {value === null ? (
              <span className="h-2 w-2 rounded-full bg-gn-accent" />
            ) : null}
          </span>
          <span className="text-sm font-medium text-white/90">{t("noMusic")}</span>
        </button>

        {!loading && !loadError && filtered.length === 0 && tracks.length > 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 bg-black/30 px-3 py-6 text-center text-sm text-white/50">
            {t("noTracksFound")}
          </p>
        ) : null}

        {!loading && !loadError
          ? filtered.map((track) => {
              const selected = value === track.id;
              const playing = playingId === track.id;
              const meta = [track.genre, track.mood].filter(Boolean).join(" · ");
              return (
                <div
                  key={track.id}
                  className={[
                    "flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-3",
                    selected
                      ? "border-gn-accent/55 bg-gn-accent/[0.1] ring-1 ring-gn-accent/20"
                      : "border-white/10 bg-white/[0.03]",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(track.id, track)}
                    className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/50 rounded-lg"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{track.title}</span>
                      {selected ? (
                        <span className="rounded-full bg-gn-accent/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gn-accent">
                          {t("selected")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-white/55">{track.artist}</p>
                    {meta ? (
                      <p className="mt-1 text-[11px] text-white/40">{meta}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] tabular-nums text-white/35">
                      {formatTrackDuration(track.duration_seconds)}
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => togglePreview(track)}
                    className="shrink-0 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-gn-accent/40 hover:bg-gn-accent/10"
                    aria-pressed={playing}
                  >
                    {playing ? t("pausePreview") : t("playPreview")}
                  </button>
                </div>
              );
            })
          : null}
      </div>
    </section>
  );
}
