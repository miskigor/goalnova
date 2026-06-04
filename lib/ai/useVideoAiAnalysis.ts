"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import type { VideoAnalysisScores } from "@/lib/ai/types";
import {
  AI_ANALYSIS_REQUEST_TIMEOUT_MS,
  requestVideoAiAnalysis,
  VideoAiRequestError,
} from "@/lib/ai/requestVideoAiAnalysis";
import { getAiErrorReasonLabel } from "@/lib/ai/aiErrorReasonLabel";
import { normalizeAiErrorCode } from "@/lib/ai/normalizeAiErrorCode";
import { logAiAnalysisFailed, logAiAnalysisStarted } from "@/lib/ai/aiAnalysisClientLog";
import {
  fetchPersistedVideoAiAnalysis,
  mapAiAnalysisRowToScores,
  upsertPersistedVideoAiAnalysis,
} from "@/lib/ai/videoAiAnalysis";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { supabase } from "@/lib/supabase/client";
import { scheduleAiAnalysisNotification } from "@/lib/supabase/notifications";

const LOAD_SAVED_TIMEOUT_MS = 20_000;
const UPSERT_TIMEOUT_MS = 30_000;

export type AiAnalysisErrorKind = "load" | "run" | null;

export type UseVideoAiAnalysisArgs = {
  open: boolean;
  videoId: string;
  viewerId: string | null;
  isPremium: boolean;
  premiumStatusLoaded: boolean;
  databaseVideoIdMissing: boolean;
  /** Called after a new analysis is computed and persisted successfully. */
  onRunSuccess?: () => void;
  /** Scout insight — uses server scout gate instead of player premium. */
  scoutInsight?: boolean;
};

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      onTimeout();
      reject(new Error("timeout"));
    }, ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(id);
        reject(e);
      });
  });
}

/**
 * Fetches saved `ai_analyses` when active; runs the AI provider only when `reanalyze()` is called.
 */
export function useVideoAiAnalysis(args: UseVideoAiAnalysisArgs) {
  const locale = useLocale();
  const {
    open,
    videoId,
    viewerId,
    isPremium,
    premiumStatusLoaded,
    databaseVideoIdMissing,
    onRunSuccess,
    scoutInsight = false,
  } = args;
  const [scores, setScores] = useState<VideoAnalysisScores | null>(null);
  const [loadSavedBusy, setLoadSavedBusy] = useState(false);
  const [runBusy, setRunBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<AiAnalysisErrorKind>(null);
  /** Machine-readable code for console diagnostics (not shown in UI). */
  const [errorCode, setErrorCode] = useState<string | null>(null);

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
    setErrorKind(null);
    setErrorCode(null);
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
    setErrorKind(null);
    setErrorCode(null);
    try {
      const { row, errorMessage } = await withTimeout(
        fetchPersistedVideoAiAnalysis(videoId),
        LOAD_SAVED_TIMEOUT_MS,
        () => {
          logAiAnalysisFailed({
            reason: "load_saved_timeout",
            error: { videoId, timeoutMs: LOAD_SAVED_TIMEOUT_MS },
          });
        },
      );
      if (errorMessage) {
        const code =
          errorMessage.length > 0
            ? `load_failed:${errorMessage}`
            : "load_failed";
        setErrorKind("load");
        setErrorCode(code);
        setError(getAiErrorReasonLabel(code, locale));
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
      const reason =
        e instanceof Error && e.message === "timeout"
          ? "load_saved_timeout"
          : "load_saved_unexpected";
      logAiAnalysisFailed({ reason, error: e });
      logFullSupabaseError("[useVideoAiAnalysis] refreshSavedFromDb unexpected", e, {
        videoId,
        viewerId,
      });
      setErrorKind("load");
      setErrorCode(reason);
      setError(getAiErrorReasonLabel(reason, locale));
    } finally {
      setLoadSavedBusy(false);
    }
  }, [active, viewerId, videoId, locale]);

  useEffect(() => {
    if (!active) return;
    void refreshSavedFromDb();
  }, [active, refreshSavedFromDb]);

  const reanalyze = useCallback(async () => {
    if (!active || !viewerId) {
      const code = "not_active";
      logAiAnalysisFailed({ reason: code, error: { active, viewerId: Boolean(viewerId) } });
      setErrorKind("run");
      setErrorCode(code);
      setError(getAiErrorReasonLabel(code, locale));
      return;
    }
    setRunBusy(true);
    setError(null);
    setErrorKind(null);
    setErrorCode(null);
    logAiAnalysisStarted({ videoId, scoutInsight, locale });
    try {
      const next = await requestVideoAiAnalysis({
        videoId,
        locale,
        scoutInsight,
      });
      const { row, errorMessage } = await withTimeout(
        upsertPersistedVideoAiAnalysis({
          userId: viewerId,
          videoId,
          scores: next,
        }),
        UPSERT_TIMEOUT_MS,
        () => {
          logAiAnalysisFailed({
            reason: "timeout",
            error: { step: "upsert", timeoutMs: UPSERT_TIMEOUT_MS },
          });
        },
      );
      if (errorMessage || !row) {
        const code = normalizeAiErrorCode(
          errorMessage ? `save_failed:${errorMessage}` : "save_failed",
        );
        setErrorKind("run");
        setErrorCode(code);
        setError(getAiErrorReasonLabel(code, locale));
        logAiAnalysisFailed({ reason: code, error: errorMessage });
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
      const raw =
        e instanceof VideoAiRequestError
          ? e.code
          : e instanceof Error && e.message === "timeout"
            ? "timeout"
            : e instanceof Error
              ? e.message
              : "unknown";
      const code = normalizeAiErrorCode(raw);
      logAiAnalysisFailed({ reason: code, error: e });
      logFullSupabaseError("[useVideoAiAnalysis] reanalyze", e, {
        videoId,
        viewerId,
        code,
        timeoutMs: AI_ANALYSIS_REQUEST_TIMEOUT_MS,
      });
      setErrorKind("run");
      setErrorCode(code);
      setError(getAiErrorReasonLabel(code, locale));
    } finally {
      setRunBusy(false);
    }
  }, [active, viewerId, videoId, locale, onRunSuccess, scoutInsight]);

  return {
    scores,
    loadSavedBusy,
    runBusy,
    error,
    errorKind,
    errorCode,
    refreshSavedFromDb,
    reanalyze,
  };
}
