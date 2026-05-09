import { getVideoAnalysisProvider } from "@/lib/ai";
import { upsertAiAnalysis } from "@/lib/supabase/aiAnalyses";
import { logFullSupabaseError } from "@/lib/supabase/logError";

/**
 * Runs the configured AI provider and persists scores for a challenge submission.
 * RLS: requires `ai_analyses_*_challenge_submission` policies (video owned by user, challenge_id set).
 */
export async function runAndPersistChallengeVideoAiAnalysis(params: {
  userId: string;
  videoId: string;
  locale?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const vid = params.videoId?.trim();
  const uid = params.userId?.trim();
  if (!vid || !uid) return { ok: false, error: "invalid_params" };

  try {
    const scores = await getVideoAnalysisProvider().analyzeVideo({
      videoId: vid,
      locale: params.locale,
    });
    const { row, errorMessage } = await upsertAiAnalysis({
      userId: uid,
      videoId: vid,
      scores,
    });
    if (errorMessage || !row) {
      logFullSupabaseError(
        "[challengeUploadAiAnalysis] upsert failed",
        new Error(errorMessage ?? "no row"),
        { videoId: vid },
      );
      return { ok: false, error: errorMessage ?? "save_failed" };
    }
    return { ok: true };
  } catch (e) {
    logFullSupabaseError("[challengeUploadAiAnalysis] catch", e, { videoId: vid });
    return { ok: false, error: "analysis_failed" };
  }
}
