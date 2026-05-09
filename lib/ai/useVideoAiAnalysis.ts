"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { getVideoAnalysisProvider } from "@/lib/ai";
import type { VideoAnalysisScores } from "@/lib/ai/types";
import {
  fetchPersistedVideoAiAnalysis,
  mapAiAnalysisRowToScores,
  upsertPersistedVideoAiAnalysis,
} from "@/lib/ai/videoAiAnalysis";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { supabase } from "@/lib/supabase/client";
import { scheduleAiAnalysisNotification } from "@/lib/supabase/notifications";

export type UseVideoAiAnalysisArgs = {
  open: boolean;
  videoId: string;
  viewerId: string | null;
  isPremium: boolean;
  premiumStatusLoaded: boolean;
  databaseVideoIdMissing: boolean;
  /** Called after a new analysis is computed and persisted successfully. */
  onRunSuccess?: () => void;
};

/**
 * Fetches saved `ai_analyses` when active; runs the AI provider only when `reanalyze()` is called.
 */
export function useVideoAiAnalysis(args: UseVideoAiAnalysisArgs) {
  const locale = useLocale();
  const t = useTranslations("ai");
  const tErr = useTranslations("errors");
  const {
    open,
    videoId,
    viewerId,
    isPremium,
    premiumStatusLoaded,
    databaseVideoIdMissing,
    onRunSuccess,
  } = args;
  const [scores, setScores] = useState<VideoAnalysisScores | null>(null);
  const [loadSavedBusy, setLoadSavedBusy] = useState(false);
  const [runBusy, setRunBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active =
    open &&
    !databaseVideoIdMissing &&
    Boolean(videoId.trim()) &&
    Boolean(viewerId) &&
    isPremium &&
    premiumStatusLoaded;

  const resetLocal = useCallback(() => {
    setScores(null);
    setError(null);
    setRunBusy(false);
    setLoadSavedBusy(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetLocal();
      return;
    }
    resetLocal();
  }, [open, videoId, resetLocal]);

  const refreshSavedFromDb = useCallback(async () => {
    if (!active || !viewerId) return;
    setLoadSavedBusy(true);
    setError(null);
    try {
      const { row, errorMessage } = await fetchPersistedVideoAiAnalysis(videoId);
      if (errorMessage) {
        setError(t("loadError"));
        logFullSupabaseError(
          "[useVideoAiAnalysis] refreshSavedFromDb",
          new Error(errorMessage),
          { videoId, viewerId, detail: errorMessage },
        );
        return;
      }
      if (row) {
        setScores(mapAiAnalysisRowToScores(row));
      }
    } catch (e) {
      logFullSupabaseError("[useVideoAiAnalysis] refreshSavedFromDb unexpected", e, {
        videoId,
        viewerId,
      });
      setError(t("loadError"));
    } finally {
      setLoadSavedBusy(false);
    }
  }, [active, viewerId, videoId, t]);

  useEffect(() => {
    if (!active) return;
    void refreshSavedFromDb();
  }, [active, refreshSavedFromDb]);

  const reanalyze = useCallback(async () => {
    if (!active || !viewerId) return;
    setRunBusy(true);
    setError(null);
    try {
      const provider = getVideoAnalysisProvider();
      const next = await provider.analyzeVideo({ videoId, locale });
      const { row, errorMessage } = await upsertPersistedVideoAiAnalysis({
        userId: viewerId,
        videoId,
        scores: next,
      });
      if (errorMessage || !row) {
        setError(t("analysisSaveFailed"));
        logFullSupabaseError(
          "[useVideoAiAnalysis] reanalyze upsert",
          new Error(errorMessage ?? "no row returned"),
          {
            videoId,
            viewerId,
            supabaseMessage: errorMessage,
            onConflict: "video_id",
          },
        );
        return;
      }
      setScores(mapAiAnalysisRowToScores(row));
      scheduleAiAnalysisNotification(supabase, videoId, viewerId);
      onRunSuccess?.();
    } catch (e) {
      logFullSupabaseError("[useVideoAiAnalysis] reanalyze", e, {
        videoId,
        viewerId,
      });
      setError(tErr("analysis"));
    } finally {
      setRunBusy(false);
    }
  }, [active, viewerId, videoId, locale, onRunSuccess, t, tErr]);

  return {
    scores,
    loadSavedBusy,
    runBusy,
    error,
    refreshSavedFromDb,
    reanalyze,
  };
}
