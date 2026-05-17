"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Database } from "@/lib/supabase/client";
import { supabase } from "@/lib/supabase/client";
import { slugifyChallengeTitle } from "@/lib/challenges/challengeRowUtils";
import { isLooseUuid } from "@/lib/uuid";
import { devLog } from "@/lib/devLog";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  fetchManualWinnerRows,
  replaceManualChallengeWinners,
} from "@/lib/supabase/challengeWinners";
import { notifyPlayersAboutChallengeRpc } from "@/lib/supabase/notifications";

type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];
type ChallengeStatus = "draft" | "active" | "ended";

const STATUSES: ChallengeStatus[] = ["draft", "active", "ended"];

const REWARD_TYPES = [
  "",
  "gear",
  "digital",
  "cash",
  "feature",
  "recognition",
  "other",
] as const;

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

function formatExpiresDisplay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

function isMissingTableError(error: unknown): boolean {
  const e = error as { code?: string | null } | null;
  return e?.code === "PGRST205";
}

function getMissingChallengesColumn(error: unknown): string | null {
  const e = error as { code?: string | null; message?: string | null } | null;
  if (e?.code !== "PGRST204") return null;
  const message = String(e?.message ?? "");
  if (!message.toLowerCase().includes("challenges")) return null;
  const m = message.match(/Could not find the '([^']+)' column/i);
  return m?.[1]?.trim() || null;
}

export type AdminChallengesPageProps = {
  /** When `"create"`, show the create form immediately (e.g. `/admin/challenges/new`). */
  defaultMode?: "idle" | "create";
};

export function AdminChallengesPage({ defaultMode = "idle" }: AdminChallengesPageProps) {
  const t = useTranslations("adminChallenges");
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusChallengeId = searchParams.get("challengeId")?.trim() ?? null;
  const appliedFocusId = useRef<string | null>(null);
  const formCardRef = useRef<HTMLElement | null>(null);

  const [rows, setRows] = useState<ChallengeRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [mode, setMode] = useState<"idle" | "create" | "edit">(() =>
    defaultMode === "create" ? "create" : "idle",
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [maxVideoDurationSeconds, setMaxVideoDurationSeconds] = useState("");
  const [equipmentJson, setEquipmentJson] = useState("");
  const [rulesJson, setRulesJson] = useState("");
  const [scoringJson, setScoringJson] = useState("");
  const [badge, setBadge] = useState("");
  const [translationsJson, setTranslationsJson] = useState("");
  const [rules, setRules] = useState("");
  const [reward, setReward] = useState("");
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardDetail, setRewardDetail] = useState("");
  const [rewardType, setRewardType] = useState("");
  const [rewardImageUrl, setRewardImageUrl] = useState("");
  const [manualWinnersCsv, setManualWinnersCsv] = useState("");
  const [expiresLocal, setExpiresLocal] = useState("");
  const [status, setStatus] = useState<ChallengeStatus>("draft");

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [notifyBusyId, setNotifyBusyId] = useState<string | null>(null);
  const [notifyBanner, setNotifyBanner] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setNotifyBanner(null);
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      logFullSupabaseError("[admin challenges] list", error);
      setListError(error.message ?? t("loadError"));
      setRows([]);
    } else {
      setRows((data ?? []) as ChallengeRow[]);
    }
    setListLoading(false);
  }, [t]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  /** Clears all form fields; does not change `mode` (avoids idle/create fighting in one tick). */
  const clearChallengeFormFields = useCallback(() => {
    setSlug("");
    setTitle("");
    setDescription("");
    setInstructions("");
    setMaxVideoDurationSeconds("");
    setEquipmentJson("");
    setRulesJson("");
    setScoringJson("");
    setBadge("");
    setTranslationsJson("");
    setRules("");
    setReward("");
    setRewardTitle("");
    setRewardDetail("");
    setRewardType("");
    setRewardImageUrl("");
    setManualWinnersCsv("");
    setExpiresLocal("");
    setStatus("draft");
    setFormError(null);
    setFormSuccess(null);
    setEditingId(null);
  }, []);

  const resetForm = useCallback(() => {
    clearChallengeFormFields();
    setMode("idle");
  }, [clearChallengeFormFields]);

  const cancelForm = useCallback(() => {
    if (mode === "create") {
      devLog("challenge form cancel", { navigateTo: "/admin/challenges" });
      router.push("/admin/challenges");
      return;
    }
    resetForm();
  }, [mode, resetForm, router]);

  const openEdit = useCallback((row: ChallengeRow) => {
    setMode("edit");
    setEditingId(row.id);
    setSlug(row.slug);
    setTitle(row.title);
    setDescription(row.description ?? "");
    setInstructions(row.instructions ?? "");
    setMaxVideoDurationSeconds(
      row.max_video_duration_seconds != null ? String(row.max_video_duration_seconds) : "",
    );
    setEquipmentJson(row.equipment != null ? JSON.stringify(row.equipment, null, 2) : "");
    setRulesJson(row.rules_json != null ? JSON.stringify(row.rules_json, null, 2) : "");
    setScoringJson(row.scoring != null ? JSON.stringify(row.scoring, null, 2) : "");
    setBadge(row.badge?.trim() ?? "");
    setTranslationsJson(
      row.translations != null ? JSON.stringify(row.translations, null, 2) : "",
    );
    setRules(row.rules ?? "");
    setReward(row.reward ?? "");
    setRewardTitle(row.reward_title?.trim() ?? "");
    setRewardDetail(row.reward_detail?.trim() ?? "");
    setRewardType(row.reward_type?.trim() ?? "");
    setRewardImageUrl(row.reward_image_url?.trim() ?? "");
    setManualWinnersCsv("");
    void (async () => {
      const { rows } = await fetchManualWinnerRows(row.id);
      setManualWinnersCsv(rows.map((r) => r.video_id).join(", "));
    })();
    setExpiresLocal(toDatetimeLocalValue(row.expires_at));
    setStatus(
      row.status === "draft" || row.status === "active" || row.status === "ended"
        ? row.status
        : "draft",
    );
    setFormError(null);
    setFormSuccess(null);
    requestAnimationFrame(() => {
      formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    if (listLoading || !focusChallengeId || rows.length === 0) return;
    if (appliedFocusId.current === focusChallengeId) return;
    const row = rows.find((r) => r.id === focusChallengeId);
    if (row) {
      openEdit(row);
      appliedFocusId.current = focusChallengeId;
    }
  }, [listLoading, focusChallengeId, rows, openEdit]);

  const onTitleBlurCreateSlug = useCallback(() => {
    if (mode !== "create") return;
    if (slug.trim().length > 0) return;
    if (title.trim().length === 0) return;
    setSlug(slugifyChallengeTitle(title));
  }, [mode, slug, title]);

  const submitForm = useCallback(async () => {
    setFormError(null);
    setFormSuccess(null);
    const titleTrim = title.trim();
    if (!titleTrim) {
      setFormError(t("titleRequired"));
      return;
    }
    let slugFinal = slug.trim();
    if (mode === "create" && !slugFinal) {
      slugFinal = slugifyChallengeTitle(titleTrim);
      setSlug(slugFinal);
    }
    if (!slugFinal) {
      setFormError(t("slugRequired"));
      return;
    }

    setFormLoading(true);
    const equipmentParsed = equipmentJson.trim()
      ? (() => {
          try {
            return JSON.parse(equipmentJson);
          } catch {
            return "__invalid_json__";
          }
        })()
      : null;
    if (equipmentParsed === "__invalid_json__") {
      setFormLoading(false);
      setFormError(t("jsonInvalidEquipment"));
      return;
    }
    const rulesParsed = rulesJson.trim()
      ? (() => {
          try {
            return JSON.parse(rulesJson);
          } catch {
            return "__invalid_json__";
          }
        })()
      : null;
    if (rulesParsed === "__invalid_json__") {
      setFormLoading(false);
      setFormError(t("jsonInvalidRules"));
      return;
    }
    const scoringParsed = scoringJson.trim()
      ? (() => {
          try {
            return JSON.parse(scoringJson);
          } catch {
            return "__invalid_json__";
          }
        })()
      : null;
    if (scoringParsed === "__invalid_json__") {
      setFormLoading(false);
      setFormError(t("jsonInvalidScoring"));
      return;
    }
    const translationsParsed = translationsJson.trim()
      ? (() => {
          try {
            return JSON.parse(translationsJson);
          } catch {
            return "__invalid_json__";
          }
        })()
      : null;
    if (translationsParsed === "__invalid_json__") {
      setFormLoading(false);
      setFormError(t("jsonInvalidTranslations"));
      return;
    }
    const maxDurationTrim = maxVideoDurationSeconds.trim();
    const maxDurationParsed =
      maxDurationTrim.length > 0 ? Number.parseInt(maxDurationTrim, 10) : null;
    if (
      maxDurationTrim.length > 0 &&
      (!Number.isFinite(maxDurationParsed) || (maxDurationParsed ?? 0) <= 0)
    ) {
      setFormLoading(false);
      setFormError(t("maxVideoDurationInvalid"));
      return;
    }
    const rt = rewardTitle.trim();
    const rd = rewardDetail.trim();
    const legacyReward =
      rt || rd ? [rt, rd].filter(Boolean).join(" — ").slice(0, 500) : reward.trim() || null;

    const payload = {
      slug: slugFinal,
      title: titleTrim,
      description: description.trim() || null,
      instructions: instructions.trim() || null,
      max_video_duration_seconds: maxDurationParsed,
      equipment: equipmentParsed,
      rules_json: rulesParsed,
      scoring: scoringParsed,
      badge: badge.trim() || null,
      translations: translationsParsed,
      rules: rules.trim() || null,
      reward: legacyReward,
      reward_title: rt || null,
      reward_detail: rd || null,
      reward_type: rewardType.trim() || null,
      reward_image_url: rewardImageUrl.trim() || null,
      expires_at: fromDatetimeLocal(expiresLocal),
      status,
    };

    const retryPayload: Record<string, unknown> = { ...payload };
    const runInsert = async () =>
      supabase.from("challenges").insert(retryPayload as Database["public"]["Tables"]["challenges"]["Insert"]);
    const runUpdate = async () =>
      supabase
        .from("challenges")
        .update(retryPayload as Database["public"]["Tables"]["challenges"]["Update"])
        .eq("id", editingId ?? "");

    if (mode === "create") {
      let { error } = await runInsert();
      const removedColumns = new Set<string>();
      while (error) {
        const missingColumn = getMissingChallengesColumn(error);
        if (!missingColumn || removedColumns.has(missingColumn)) break;
        removedColumns.add(missingColumn);
        delete retryPayload[missingColumn];
        ({ error } = await runInsert());
      }
      setFormLoading(false);
      if (error) {
        logFullSupabaseError("[admin challenges] insert", error);
        setFormError(error.message ?? t("saveError"));
        return;
      }
      setFormSuccess(t("createSuccess"));
      await loadList();
      devLog("challenge created; navigating to list", { route: "/admin/challenges" });
      router.replace("/admin/challenges");
      return;
    }

    if (mode === "edit" && editingId) {
      let { error } = await runUpdate();
      const removedColumns = new Set<string>();
      while (error) {
        const missingColumn = getMissingChallengesColumn(error);
        if (!missingColumn || removedColumns.has(missingColumn)) break;
        removedColumns.add(missingColumn);
        delete retryPayload[missingColumn];
        ({ error } = await runUpdate());
      }
      setFormLoading(false);
      if (error) {
        logFullSupabaseError("[admin challenges] update", error);
        setFormError(error.message ?? t("saveError"));
        return;
      }
      const winnerIds = manualWinnersCsv
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter((id) => isLooseUuid(id));
      const uniqueWinners: string[] = [];
      for (const id of winnerIds) {
        if (!uniqueWinners.includes(id)) uniqueWinners.push(id);
      }
      const podiumRes = await replaceManualChallengeWinners({
        challengeId: editingId,
        orderedVideoIds: uniqueWinners.slice(0, 3),
      });
      if (!podiumRes.ok) {
        setFormSuccess(null);
        setFormError(t("winnersSaveWarning", { detail: podiumRes.error }));
        await loadList();
        return;
      }
      setFormSuccess(t("updateSuccess"));
      await loadList();
    }
  }, [
    title,
    slug,
    description,
    instructions,
    maxVideoDurationSeconds,
    equipmentJson,
    rulesJson,
    scoringJson,
    badge,
    translationsJson,
    rules,
    reward,
    rewardTitle,
    rewardDetail,
    rewardType,
    rewardImageUrl,
    manualWinnersCsv,
    expiresLocal,
    status,
    mode,
    editingId,
    loadList,
    router,
    t,
  ]);

  const notifyPlayers = useCallback(
    async (challengeId: string) => {
      setNotifyBanner(null);
      setListError(null);
      setNotifyBusyId(challengeId);
      const res = await notifyPlayersAboutChallengeRpc(supabase, challengeId);
      setNotifyBusyId(null);
      if (!res.ok) {
        if (res.error === "challenge_not_active") {
          setNotifyBanner({ kind: "err", text: t("notifyPlayersNotActive") });
        } else {
          setNotifyBanner({ kind: "err", text: t("notifyPlayersError") });
        }
        return;
      }
      setNotifyBanner({
        kind: "ok",
        text: t("notifyPlayersSuccess", { count: res.inserted }),
      });
    },
    [t],
  );

  const deleteChallenge = useCallback(
    async (id: string) => {
      if (!window.confirm(t("deleteConfirm"))) return;
      setListError(null);
      setDeleteBusyId(id);
      const detachVideos = await supabase
        .from("videos")
        .update({ challenge_id: null })
        .eq("challenge_id", id);
      if (detachVideos.error) {
        setDeleteBusyId(null);
        logFullSupabaseError("[admin challenges] delete detach videos", detachVideos.error, {
          challengeId: id,
        });
        setListError(detachVideos.error.message ?? t("saveError"));
        return;
      }

      const delEntries = await supabase.from("challenge_entries").delete().eq("challenge_id", id);
      if (delEntries.error && !isMissingTableError(delEntries.error)) {
        setDeleteBusyId(null);
        logFullSupabaseError("[admin challenges] delete challenge_entries", delEntries.error, {
          challengeId: id,
        });
        setListError(delEntries.error.message ?? t("saveError"));
        return;
      }

      const delWinners = await supabase.from("challenge_winners").delete().eq("challenge_id", id);
      if (delWinners.error && !isMissingTableError(delWinners.error)) {
        setDeleteBusyId(null);
        logFullSupabaseError("[admin challenges] delete challenge_winners", delWinners.error, {
          challengeId: id,
        });
        setListError(delWinners.error.message ?? t("saveError"));
        return;
      }

      const clearNotif = await supabase
        .from("notifications")
        .update({ related_challenge_id: null })
        .eq("related_challenge_id", id);
      if (clearNotif.error) {
        setDeleteBusyId(null);
        logFullSupabaseError("[admin challenges] delete clear notifications", clearNotif.error, {
          challengeId: id,
        });
        setListError(clearNotif.error.message ?? t("saveError"));
        return;
      }

      const { error } = await supabase.from("challenges").delete().eq("id", id);
      setDeleteBusyId(null);
      if (error) {
        logFullSupabaseError("[admin challenges] delete", error);
        const isForeignKeyVideos =
          (error as { code?: string | null; message?: string | null }).code === "23503" &&
          String((error as { message?: string | null }).message ?? "")
            .toLowerCase()
            .includes("videos_challenge_id_fkey");
        setListError(
          isForeignKeyVideos ? t("deleteBlockedByVideos") : error.message ?? t("saveError"),
        );
        return;
      }
      if (editingId === id) {
        resetForm();
      }
      await loadList();
    },
    [loadList, editingId, resetForm, t],
  );

  const endChallenge = useCallback(
    async (id: string) => {
      setListError(null);
      const { error } = await supabase
        .from("challenges")
        .update({ status: "ended" })
        .eq("id", id);
      if (error) {
        logFullSupabaseError("[admin challenges] end", error);
        setListError(error.message ?? t("saveError"));
        return;
      }
      await loadList();
      if (editingId === id) {
        setStatus("ended");
      }
    },
    [loadList, editingId, t],
  );

  const formTitle = useMemo(() => {
    if (mode === "create") return t("formCreateTitle");
    if (mode === "edit") return t("formEditTitle");
    return t("formIdleHint");
  }, [mode, t]);

  const statusLabel = useCallback(
    (value: string) => {
      if (value === "draft") return t("statusDraft");
      if (value === "active") return t("statusActive");
      if (value === "ended") return t("statusEnded");
      return value;
    },
    [t],
  );

  const rewardTypeLabel = useCallback(
    (value: string | null) => {
      if (!value) return t("rewardTypeUnset");
      if (value === "gear") return t("rewardTypeGear");
      if (value === "digital") return t("rewardTypeDigital");
      if (value === "cash") return t("rewardTypeCash");
      if (value === "feature") return t("rewardTypeFeature");
      if (value === "recognition") return t("rewardTypeRecognition");
      if (value === "other") return t("rewardTypeOther");
      return value;
    },
    [t],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("pageTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("pageSubtitle")}</p>
        </div>
        <Link
          href="/admin/challenges/new"
          className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400"
          onClick={() => {
            devLog("new challenge clicked", {
              targetRoute: "/admin/challenges/new",
            });
          }}
        >
          {t("newChallenge")}
        </Link>
      </div>

      {listError ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {listError}
        </p>
      ) : null}

      {notifyBanner ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            notifyBanner.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
              : "border-red-500/40 bg-red-950/40 text-red-200"
          }`}
          role="status"
        >
          {notifyBanner.text}
        </p>
      ) : null}

      <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_minmax(440px,560px)]">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            {t("listHeading")}
          </h2>
          {listLoading ? (
            <p className="text-sm text-zinc-500">{t("loading")}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("listEmpty")}</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => {
                const equipment = toStringArray(row.equipment);
                const rules = toStringArray(row.rules_json);
                return (
                  <article
                    key={row.id}
                    className="w-full rounded-xl border border-white/10 bg-black/35 p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-white">{row.title}</h3>
                        <p className="mt-1 break-words font-mono text-[11px] text-zinc-500">
                          {t("colSlug")}: {row.slug}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-xs text-zinc-300">
                        {statusLabel(row.status)}
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{t("colReward")}</dt>
                        <dd className="mt-1 text-zinc-200">
                          {row.reward_title?.trim() || row.reward?.trim() || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
                          {t("fieldRewardType")}
                        </dt>
                        <dd className="mt-1 text-zinc-200">{rewardTypeLabel(row.reward_type)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{t("colCreated")}</dt>
                        <dd className="mt-1 text-zinc-200">{formatExpiresDisplay(row.created_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{t("colExpires")}</dt>
                        <dd className="mt-1 text-zinc-200">{formatExpiresDisplay(row.expires_at)}</dd>
                      </div>
                    </dl>

                    {row.description?.trim() ? (
                      <div className="mt-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          {t("fieldDescription")}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-zinc-300">{row.description.trim()}</p>
                      </div>
                    ) : null}

                    {rules.length > 0 || equipment.length > 0 || row.badge?.trim() ? (
                      <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3">
                        {rules.length > 0 ? (
                          <>
                            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                              {t("fieldRulesJson")}
                            </p>
                            <ul className="mt-1 list-disc space-y-1 ps-5 text-zinc-300">
                              {rules.map((ruleItem) => (
                                <li key={ruleItem}>{ruleItem}</li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                        {equipment.length > 0 ? (
                          <p className="mt-2 text-zinc-300">
                            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                              {t("fieldEquipmentJson")}:
                            </span>{" "}
                            {equipment.join(", ")}
                          </p>
                        ) : null}
                        {row.badge?.trim() ? (
                          <p className="mt-2 text-zinc-300">
                            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                              {t("fieldBadge")}:
                            </span>{" "}
                            {row.badge.trim()}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
                      >
                        {t("edit")}
                      </button>
                      {row.status === "active" ? (
                        <button
                          type="button"
                          disabled={notifyBusyId === row.id}
                          onClick={() => void notifyPlayers(row.id)}
                          className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {notifyBusyId === row.id ? t("notifyPlayersBusy") : t("notifyPlayers")}
                        </button>
                      ) : null}
                      {row.status !== "ended" ? (
                        <button
                          type="button"
                          onClick={() => void endChallenge(row.id)}
                          className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600"
                        >
                          {t("endChallenge")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={deleteBusyId === row.id}
                        onClick={() => void deleteChallenge(row.id)}
                        className="rounded-md bg-red-900/80 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-800 disabled:opacity-50"
                      >
                        {deleteBusyId === row.id ? t("deleting") : t("deleteChallenge")}
                      </button>
                    </div>
                  </article>
                );
              })}
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
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldSlug")}
                <input
                  suppressHydrationWarning
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={formLoading}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                  placeholder={t("fieldSlugPlaceholder")}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldTitle")} *
                <input
                  suppressHydrationWarning
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={onTitleBlurCreateSlug}
                  disabled={formLoading}
                  required
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldDescription")}
                <textarea
                  suppressHydrationWarning
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={formLoading}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldInstructions")}
                <textarea
                  suppressHydrationWarning
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  disabled={formLoading}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldMaxVideoDuration")}
                <input
                  suppressHydrationWarning
                  value={maxVideoDurationSeconds}
                  onChange={(e) => setMaxVideoDurationSeconds(e.target.value)}
                  disabled={formLoading}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                  placeholder="15"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldEquipmentJson")}
                <textarea
                  suppressHydrationWarning
                  value={equipmentJson}
                  onChange={(e) => setEquipmentJson(e.target.value)}
                  disabled={formLoading}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-white outline-none focus:border-orange-500/50"
                  placeholder='["2 cones","phone camera"]'
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldRulesJson")}
                <textarea
                  suppressHydrationWarning
                  value={rulesJson}
                  onChange={(e) => setRulesJson(e.target.value)}
                  disabled={formLoading}
                  rows={4}
                  className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-white outline-none focus:border-orange-500/50"
                  placeholder='["Rule 1","Rule 2"]'
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldScoringJson")}
                <textarea
                  suppressHydrationWarning
                  value={scoringJson}
                  onChange={(e) => setScoringJson(e.target.value)}
                  disabled={formLoading}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-white outline-none focus:border-orange-500/50"
                  placeholder='{"sprint_time":60}'
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldBadge")}
                <input
                  suppressHydrationWarning
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  disabled={formLoading}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                  placeholder={t("fieldBadgePlaceholder")}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldTranslationsJson")}
                <textarea
                  suppressHydrationWarning
                  value={translationsJson}
                  onChange={(e) => setTranslationsJson(e.target.value)}
                  disabled={formLoading}
                  rows={7}
                  className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-white outline-none focus:border-orange-500/50"
                  placeholder={'{"hr":{"title":"...","description":"...","instructions":"...","rules":"...","badge":"..."}}'}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldRules")}
                <textarea
                  suppressHydrationWarning
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  disabled={formLoading}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldRewardTitle")}
                <input
                  suppressHydrationWarning
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  disabled={formLoading}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                  placeholder={t("fieldRewardTitlePlaceholder")}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldRewardType")}
                <select
                  suppressHydrationWarning
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value)}
                  disabled={formLoading}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                >
                  {REWARD_TYPES.map((v) => (
                    <option key={v || "unset"} value={v}>
                      {v ? v : t("rewardTypeUnset")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldRewardDetail")}
                <textarea
                  suppressHydrationWarning
                  value={rewardDetail}
                  onChange={(e) => setRewardDetail(e.target.value)}
                  disabled={formLoading}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                  placeholder={t("fieldRewardDetailPlaceholder")}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldRewardImageUrl")}
                <input
                  suppressHydrationWarning
                  value={rewardImageUrl}
                  onChange={(e) => setRewardImageUrl(e.target.value)}
                  disabled={formLoading}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                  placeholder="https://…"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldRewardLegacy")}
                <input
                  suppressHydrationWarning
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  disabled={formLoading}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                />
              </label>
              {mode === "edit" ? (
                <label className="block text-xs font-medium text-zinc-500">
                  {t("fieldManualWinners")}
                  <textarea
                    suppressHydrationWarning
                    value={manualWinnersCsv}
                    onChange={(e) => setManualWinnersCsv(e.target.value)}
                    disabled={formLoading}
                    rows={2}
                    className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-white outline-none focus:border-orange-500/50"
                    placeholder={t("fieldManualWinnersPlaceholder")}
                  />
                </label>
              ) : null}
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldExpires")}
                <input
                  suppressHydrationWarning
                  type="datetime-local"
                  value={expiresLocal}
                  onChange={(e) => setExpiresLocal(e.target.value)}
                  disabled={formLoading}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                {t("fieldStatus")}
                <select
                  suppressHydrationWarning
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ChallengeStatus)}
                  disabled={formLoading}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              {formError ? (
                <p className="text-sm text-red-300">{formError}</p>
              ) : null}
              {formSuccess ? (
                <p className="text-sm text-emerald-400">{formSuccess}</p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {formLoading
                    ? t("saving")
                    : mode === "create"
                      ? t("createChallenge")
                      : t("saveChanges")}
                </button>
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => {
                    devLog("challenge form cancel click", { mode });
                    cancelForm();
                  }}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
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
