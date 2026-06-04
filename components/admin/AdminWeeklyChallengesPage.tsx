"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import type {
  WeeklyChallengeFormInput,
  WeeklyChallengeLocaleContent,
  WeeklyChallengeRow,
} from "@/lib/supabase/weeklyChallenges.types";
import {
  createWeeklyChallenge,
  fetchWeeklyChallengesAdminList,
  listDisplayTitle,
  localeHasOwnTranslation,
  updateWeeklyChallenge,
  weeklyChallengeRowToForm,
} from "@/lib/supabase/weeklyChallengesAdmin";
import { WEEKLY_CHALLENGE_CONTENT_LOCALES } from "@/lib/weeklyChallenges/weeklyChallengeLocales";
import { emptyWeeklyChallengeTranslations } from "@/lib/weeklyChallenges/weeklyChallengeTranslations";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

const EMPTY_FORM: WeeklyChallengeFormInput = {
  translations: emptyWeeklyChallengeTranslations(),
  rewardXp: 0,
  maxVideoDurationSeconds: 60,
  freeAttempts: 1,
  premiumAttempts: 0,
  startsAt: null,
  endsAt: null,
  isActive: false,
  isPublic: false,
};

type LocaleContentField = keyof WeeklyChallengeLocaleContent;

export function AdminWeeklyChallengesPage() {
  const t = useTranslations("adminWeeklyChallenges");

  const [rows, setRows] = useState<WeeklyChallengeRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [mode, setMode] = useState<"idle" | "create" | "edit">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<WeeklyChallengeRow | null>(null);
  const [form, setForm] = useState<WeeklyChallengeFormInput>(EMPTY_FORM);
  const [contentLocale, setContentLocale] = useState<AppLocale>("en");
  const [startsLocal, setStartsLocal] = useState("");
  const [endsLocal, setEndsLocal] = useState("");
  const [maxDurationLocal, setMaxDurationLocal] = useState("60");

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const formCardRef = useRef<HTMLElement | null>(null);

  const localeContent = form.translations[contentLocale];
  const showsBaseFallbackHint =
    mode === "edit" && editingRow != null && !localeHasOwnTranslation(editingRow, contentLocale);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    const { rows: next, error } = await fetchWeeklyChallengesAdminList();
    setRows(next);
    setListError(error);
    setListLoading(false);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const formTitle = useMemo(() => {
    if (mode === "create") return t("formCreateTitle");
    if (mode === "edit") return t("formEditTitle");
    return t("formIdleHint");
  }, [mode, t]);

  function setLocaleField(field: LocaleContentField, value: string) {
    setForm((f) => ({
      ...f,
      translations: {
        ...f.translations,
        [contentLocale]: {
          ...f.translations[contentLocale],
          [field]: value,
        },
      },
    }));
  }

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setContentLocale("en");
    setStartsLocal("");
    setEndsLocal("");
    setMaxDurationLocal("60");
    setFormError(null);
    setFormSuccess(null);
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openEdit(row: WeeklyChallengeRow) {
    const next = weeklyChallengeRowToForm(row);
    setMode("edit");
    setEditingId(row.id);
    setEditingRow(row);
    setForm(next);
    setContentLocale("en");
    setStartsLocal(toDatetimeLocalValue(row.starts_at));
    setEndsLocal(toDatetimeLocalValue(row.ends_at));
    setMaxDurationLocal(
      row.max_video_duration_seconds != null
        ? String(row.max_video_duration_seconds)
        : "",
    );
    setFormError(null);
    setFormSuccess(null);
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelForm() {
    setMode("idle");
    setEditingId(null);
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormSuccess(null);
  }

  async function submitForm() {
    const enTitle = form.translations.en.title.trim();
    if (!enTitle) {
      setFormError(t("titleRequired"));
      setContentLocale("en");
      return;
    }

    const maxDurRaw = maxDurationLocal.trim();
    let maxVideoDurationSeconds: number | null = null;
    if (maxDurRaw) {
      const n = Number.parseInt(maxDurRaw, 10);
      if (!Number.isFinite(n) || n <= 0) {
        setFormError(t("maxVideoDurationInvalid"));
        return;
      }
      maxVideoDurationSeconds = n;
    }

    const payload: WeeklyChallengeFormInput = {
      ...form,
      rewardXp: Number.isFinite(form.rewardXp) ? Math.max(0, Math.floor(form.rewardXp)) : 0,
      freeAttempts: Math.max(0, Math.floor(form.freeAttempts)),
      premiumAttempts: Math.max(0, Math.floor(form.premiumAttempts)),
      maxVideoDurationSeconds,
      startsAt: fromDatetimeLocal(startsLocal),
      endsAt: fromDatetimeLocal(endsLocal),
    };

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);

    if (mode === "create") {
      const { row, error } = await createWeeklyChallenge(payload);
      setFormLoading(false);
      if (error || !row) {
        setFormError(error ?? t("saveError"));
        return;
      }
      setFormSuccess(t("createSuccess"));
      await loadList();
      openEdit(row);
      return;
    }

    if (mode === "edit" && editingId) {
      const { error } = await updateWeeklyChallenge(editingId, payload);
      setFormLoading(false);
      if (error) {
        setFormError(error);
        return;
      }
      setFormSuccess(t("updateSuccess"));
      await loadList();
      return;
    }

    setFormLoading(false);
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50";
  const labelClass = "block text-xs font-medium text-zinc-500";

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{t("pageTitle")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">{t("pageSubtitle")}</p>
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
            {t("privateNotice")}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-orange-400"
        >
          {t("newChallenge")}
        </button>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_22rem]">
        <section className="min-w-0 rounded-xl border border-white/10 bg-black/40 p-4">
          <h2 className="text-sm font-semibold text-white">{t("listHeading")}</h2>
          {listLoading ? (
            <p className="mt-4 text-sm text-zinc-500">{t("loading")}</p>
          ) : listError ? (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {listError}
            </p>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">{t("listEmpty")}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {rows.map((row) => (
                <article
                  key={row.id}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">{listDisplayTitle(row)}</h3>
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-medium uppercase tracking-wide">
                      {row.is_active ? (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-200">
                          {t("badgeActive")}
                        </span>
                      ) : (
                        <span className="rounded bg-zinc-700/80 px-2 py-0.5 text-zinc-300">
                          {t("badgeInactive")}
                        </span>
                      )}
                      {row.is_public ? (
                        <span className="rounded bg-sky-500/20 px-2 py-0.5 text-sky-200">
                          {t("badgePublic")}
                        </span>
                      ) : (
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">
                          {t("badgePrivate")}
                        </span>
                      )}
                    </div>
                  </div>
                  <dl className="mt-2 grid gap-1 text-xs text-zinc-400 sm:grid-cols-2">
                    <div>
                      <dt className="text-zinc-500">{t("colStarts")}</dt>
                      <dd className="text-zinc-300">{formatWhen(row.starts_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">{t("colEnds")}</dt>
                      <dd className="text-zinc-300">{formatWhen(row.ends_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">{t("colRewardXp")}</dt>
                      <dd className="text-zinc-300">{row.reward_xp}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">{t("colBadge")}</dt>
                      <dd className="text-zinc-300">{row.badge_name?.trim() || "—"}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="mt-3 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
                  >
                    {t("edit")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          ref={formCardRef}
          className="rounded-xl border border-white/10 bg-black/40 p-4 2xl:sticky 2xl:top-4"
        >
          <h2 className="text-sm font-semibold text-white">{formTitle}</h2>
          {mode === "idle" ? (
            <p className="mt-3 text-sm text-zinc-500">{t("formIdleBody")}</p>
          ) : (
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submitForm();
              }}
            >
              <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-3">
                <p className={labelClass}>{t("fieldContentLocale")}</p>
                <p className="text-[11px] text-zinc-500">{t("contentLocaleHint")}</p>
                <div
                  className="flex flex-wrap gap-1"
                  role="tablist"
                  aria-label={t("fieldContentLocale")}
                >
                  {WEEKLY_CHALLENGE_CONTENT_LOCALES.map((locale) => {
                    const hasOwn =
                      mode === "edit" && editingRow
                        ? localeHasOwnTranslation(editingRow, locale)
                        : locale === "en" &&
                          !!form.translations.en.title.trim();
                    return (
                      <button
                        key={locale}
                        type="button"
                        role="tab"
                        aria-selected={contentLocale === locale}
                        onClick={() => setContentLocale(locale)}
                        disabled={formLoading}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          contentLocale === locale
                            ? "bg-orange-500 text-black"
                            : "bg-white/10 text-zinc-300 hover:bg-white/15"
                        }`}
                      >
                        {locale}
                        {hasOwn ? (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              contentLocale === locale ? "bg-black/60" : "bg-emerald-400"
                            }`}
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {showsBaseFallbackHint ? (
                  <p className="text-[11px] text-amber-200/80">{t("contentUsingBaseFallback")}</p>
                ) : null}
              </div>

              <label className={labelClass}>
                {t("fieldTitle")}
                {contentLocale === "en" ? " *" : null}
                <input
                  value={localeContent.title}
                  onChange={(e) => setLocaleField("title", e.target.value)}
                  disabled={formLoading}
                  required={contentLocale === "en"}
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                {t("fieldDescription")}
                <textarea
                  value={localeContent.description}
                  onChange={(e) => setLocaleField("description", e.target.value)}
                  disabled={formLoading}
                  rows={3}
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                {t("fieldRules")}
                <textarea
                  value={localeContent.rules}
                  onChange={(e) => setLocaleField("rules", e.target.value)}
                  disabled={formLoading}
                  rows={3}
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                {t("fieldEquipment")}
                <textarea
                  value={localeContent.equipment}
                  onChange={(e) => setLocaleField("equipment", e.target.value)}
                  disabled={formLoading}
                  rows={2}
                  className={inputClass}
                  placeholder={t("fieldEquipmentPlaceholder")}
                />
              </label>

              <label className={labelClass}>
                {t("fieldBadgeName")}
                <input
                  value={localeContent.badgeName}
                  onChange={(e) => setLocaleField("badgeName", e.target.value)}
                  disabled={formLoading}
                  className={inputClass}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  {t("fieldRewardXp")}
                  <input
                    type="number"
                    min={0}
                    value={form.rewardXp}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        rewardXp: Number.parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    disabled={formLoading}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  {t("fieldMaxVideoDuration")}
                  <input
                    type="number"
                    min={1}
                    value={maxDurationLocal}
                    onChange={(e) => setMaxDurationLocal(e.target.value)}
                    disabled={formLoading}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  {t("fieldFreeAttempts")}
                  <input
                    type="number"
                    min={0}
                    value={form.freeAttempts}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        freeAttempts: Number.parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    disabled={formLoading}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  {t("fieldPremiumAttempts")}
                  <input
                    type="number"
                    min={0}
                    value={form.premiumAttempts}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        premiumAttempts: Number.parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    disabled={formLoading}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className={labelClass}>
                {t("fieldStartsAt")}
                <input
                  type="datetime-local"
                  value={startsLocal}
                  onChange={(e) => setStartsLocal(e.target.value)}
                  disabled={formLoading}
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                {t("fieldEndsAt")}
                <input
                  type="datetime-local"
                  value={endsLocal}
                  onChange={(e) => setEndsLocal(e.target.value)}
                  disabled={formLoading}
                  className={inputClass}
                />
              </label>

              <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/30 p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                    disabled={formLoading}
                    className="h-4 w-4 rounded border-white/20 accent-orange-500"
                  />
                  {t("fieldIsActive")}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isPublic: e.target.checked }))
                    }
                    disabled={formLoading}
                    className="h-4 w-4 rounded border-white/20 accent-orange-500"
                  />
                  {t("fieldIsPublic")}
                </label>
                <p className="text-[11px] text-zinc-500">{t("fieldIsPublicHint")}</p>
              </div>

              {formError ? (
                <p className="text-sm text-red-300" role="alert">
                  {formError}
                </p>
              ) : null}
              {formSuccess ? (
                <p className="text-sm text-emerald-300" role="status">
                  {formSuccess}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-50"
                >
                  {formLoading
                    ? t("saving")
                    : mode === "create"
                      ? t("createChallenge")
                      : t("saveChanges")}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  disabled={formLoading}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
