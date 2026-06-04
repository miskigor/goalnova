import { supabase } from "@/lib/supabase/client";
import type { VideoAnalysisScores } from "./types";

export type RequestVideoAiAnalysisParams = {
  videoId: string;
  locale?: string;
  /** Scout insight flow — server skips player premium requirement. */
  scoutInsight?: boolean;
};

type ApiSuccess = { ok: true; scores: VideoAnalysisScores };
type ApiFailure = { ok: false; error: string };

export async function requestVideoAiAnalysis(
  params: RequestVideoAiAnalysisParams,
): Promise<VideoAnalysisScores> {
  const videoId = params.videoId?.trim();
  if (!videoId) throw new Error("invalid_video_id");

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const token = sessionData.session?.access_token?.trim();
  if (!token) throw new Error("not_authenticated");

  const res = await fetch("/api/videos/ai-analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      videoId,
      locale: params.locale,
      scoutInsight: params.scoutInsight === true,
    }),
  });

  const body = (await res.json().catch(() => null)) as
    | ApiSuccess
    | ApiFailure
    | null;

  if (!res.ok || !body || body.ok !== true) {
    const err =
      body && "error" in body && typeof body.error === "string"
        ? body.error
        : `ai_analyze_http_${res.status}`;
    throw new Error(err);
  }

  return body.scores;
}
