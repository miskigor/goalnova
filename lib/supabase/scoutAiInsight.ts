import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type ScoutAiInsightAccess = {
  ok: boolean;
  canRun: boolean;
  previewsUsed: number;
  previewsLimit: number;
  previewsLeft: number;
  isScoutPro: boolean;
  existingAnalysis: boolean;
};

export type ScoutAiInsightRpcResult =
  | { data: ScoutAiInsightAccess; errorMessage: null }
  | { data: null; errorMessage: string; errorCode: string | null };

function parseAccessPayload(raw: unknown): ScoutAiInsightAccess | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    ok: o.ok === true,
    canRun: o.canRun === true,
    previewsUsed: Number(o.previewsUsed) || 0,
    previewsLimit: Number(o.previewsLimit) || 3,
    previewsLeft: Number(o.previewsLeft) || 0,
    isScoutPro: o.isScoutPro === true,
    existingAnalysis: o.existingAnalysis === true,
  };
}

export async function fetchScoutAiInsightAccess(params: {
  videoId: string;
  forRun?: boolean;
}): Promise<ScoutAiInsightRpcResult> {
  const { data, error } = await supabase.rpc("goalnova_consume_scout_ai_preview", {
    p_video_id: params.videoId,
    p_for_run: params.forRun ?? false,
  });

  if (error) {
    logFullSupabaseError("[scoutAiInsight] goalnova_consume_scout_ai_preview", error, {
      videoId: params.videoId,
      forRun: params.forRun ?? false,
    });
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code ?? "")
        : null;
    const msg =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message ?? "")
        : "rpc_failed";
    return { data: null, errorMessage: msg, errorCode: code };
  }

  const parsed = parseAccessPayload(data);
  if (!parsed) {
    return { data: null, errorMessage: "invalid_rpc_response", errorCode: null };
  }
  return { data: parsed, errorMessage: null };
}

export function isScoutVerificationRequiredError(message: string): boolean {
  return /scout_verification_required/i.test(message);
}

export function isScoutAiPreviewLimitError(message: string): boolean {
  return /scout_ai_preview_limit_reached/i.test(message);
}
