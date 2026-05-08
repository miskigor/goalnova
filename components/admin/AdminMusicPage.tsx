"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import {
  fetchAllMusicTracksForAdmin,
  formatTrackDuration,
  type MusicTrackRow,
} from "@/lib/supabase/musicTracks";
import { logFullSupabaseError } from "@/lib/supabase/logError";
const emptyForm = {
  title: "",
  artist: "",
  genre: "",
  mood: "",
  duration_seconds: "0",
  audio_url: "",
  cover_image_url: "",
  license_type: "royalty_free",
  provider: "PitchRusch",
  active: true,
};

export function AdminMusicPage() {
  const t = useTranslations("adminMusic");

  const [rows, setRows] = useState<MusicTrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    const { tracks, error } = await fetchAllMusicTracksForAdmin(supabase);
    if (error) {
      setListError(error);
      setRows([]);
    } else {
      setRows(tracks);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function startEdit(row: MusicTrackRow) {
    setEditingId(row.id);
    setForm({
      title: row.title,
      artist: row.artist,
      genre: row.genre ?? "",
      mood: row.mood ?? "",
      duration_seconds: String(row.duration_seconds ?? 0),
      audio_url: row.audio_url,
      cover_image_url: row.cover_image_url ?? "",
      license_type: row.license_type,
      provider: row.provider,
      active: row.active,
    });
    setFormError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormBusy(true);
    setFormError(null);

    const title = form.title.trim();
    const artist = form.artist.trim();
    const audio_url = form.audio_url.trim();
    if (!title || !artist || !audio_url) {
      setFormError(t("validationRequired"));
      setFormBusy(false);
      return;
    }

    const duration_seconds = Math.max(
      0,
      Math.floor(Number.parseInt(form.duration_seconds, 10) || 0),
    );

    const payload = {
      title,
      artist,
      genre: form.genre.trim() || null,
      mood: form.mood.trim() || null,
      duration_seconds,
      audio_url,
      cover_image_url: form.cover_image_url.trim() || null,
      license_type: form.license_type.trim() || "royalty_free",
      provider: form.provider.trim() || "PitchRusch",
      active: form.active,
    };

    if (editingId) {
      const { error } = await supabase
        .from("music_tracks")
        .update(payload)
        .eq("id", editingId);
      if (error) {
        logFullSupabaseError("[admin music] update", error);
        setFormError(error.message);
        setFormBusy(false);
        return;
      }
    } else {
      const { error } = await supabase.from("music_tracks").insert(payload);
      if (error) {
        logFullSupabaseError("[admin music] insert", error);
        setFormError(error.message);
        setFormBusy(false);
        return;
      }
    }

    setFormBusy(false);
    startCreate();
    await loadList();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-zinc-100">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{t("pageTitle")}</h1>
        <p
          role="note"
          className="rounded-xl border border-amber-500/35 bg-amber-950/40 px-4 py-3 text-sm text-amber-100/95"
        >
          {t("safetyNote")}
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{t("listHeading")}</h2>
          <button
            type="button"
            onClick={startCreate}
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400"
          >
            {t("addTrack")}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-400">{t("loadingList")}</p>
        ) : listError ? (
          <p className="text-sm text-red-400">{listError}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-400">{t("emptyList")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="pb-2 pe-3">{t("colTitle")}</th>
                  <th className="pb-2 pe-3">{t("colArtist")}</th>
                  <th className="pb-2 pe-3">{t("colGenre")}</th>
                  <th className="pb-2 pe-3">{t("colMood")}</th>
                  <th className="pb-2 pe-3">{t("colDuration")}</th>
                  <th className="pb-2 pe-3">{t("colStatus")}</th>
                  <th className="pb-2">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.06]">
                    <td className="py-2 pe-3 font-medium text-white">{r.title}</td>
                    <td className="py-2 pe-3 text-zinc-300">{r.artist}</td>
                    <td className="py-2 pe-3 text-zinc-400">{r.genre ?? "—"}</td>
                    <td className="py-2 pe-3 text-zinc-400">{r.mood ?? "—"}</td>
                    <td className="py-2 pe-3 tabular-nums text-zinc-400">
                      {formatTrackDuration(r.duration_seconds)}
                    </td>
                    <td className="py-2 pe-3">
                      <span
                        className={
                          r.active
                            ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300"
                            : "rounded-full bg-zinc-700/60 px-2 py-0.5 text-xs text-zinc-300"
                        }
                      >
                        {r.active ? t("active") : t("inactive")}
                      </span>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="text-orange-400 hover:underline"
                      >
                        {t("edit")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/40 p-5">
        <h2 className="mb-1 text-lg font-semibold text-white">
          {editingId ? t("editTrack") : t("addTrack")}
        </h2>
        <p className="mb-4 text-xs text-zinc-500">{t("createHint")}</p>

        <form onSubmit={onSubmit} className="grid max-w-xl gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">{t("colTitle")}</span>
            <input
              suppressHydrationWarning
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={t("placeholderTitle")}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">{t("colArtist")}</span>
            <input
              suppressHydrationWarning
              required
              value={form.artist}
              onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
              placeholder={t("placeholderArtist")}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-400">{t("colGenre")}</span>
              <input
                suppressHydrationWarning
                value={form.genre}
                onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                placeholder={t("placeholderGenre")}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-400">{t("colMood")}</span>
              <input
                suppressHydrationWarning
                value={form.mood}
                onChange={(e) => setForm((f) => ({ ...f, mood: e.target.value }))}
                placeholder={t("placeholderMood")}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">{t("colDuration")}</span>
            <input
              suppressHydrationWarning
              inputMode="numeric"
              value={form.duration_seconds}
              onChange={(e) => setForm((f) => ({ ...f, duration_seconds: e.target.value }))}
              placeholder={t("placeholderDuration")}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">audio_url</span>
            <input
              suppressHydrationWarning
              required
              value={form.audio_url}
              onChange={(e) => setForm((f) => ({ ...f, audio_url: e.target.value }))}
              placeholder={t("placeholderAudioUrl")}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">cover_image_url</span>
            <input
              suppressHydrationWarning
              value={form.cover_image_url}
              onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))}
              placeholder={t("placeholderCoverUrl")}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-400">{t("colLicense")}</span>
              <input
                suppressHydrationWarning
                value={form.license_type}
                onChange={(e) => setForm((f) => ({ ...f, license_type: e.target.value }))}
                placeholder={t("placeholderLicense")}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-400">{t("colProvider")}</span>
              <input
                suppressHydrationWarning
                value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                placeholder={t("placeholderProvider")}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              suppressHydrationWarning
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            {t("active")}
          </label>

          {formError ? <p className="text-sm text-red-400">{formError}</p> : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={formBusy}
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-50"
            >
              {editingId ? t("updateTrack") : t("saveTrack")}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={startCreate}
                className="rounded-full border border-white/15 px-5 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                {t("cancelEdit")}
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
