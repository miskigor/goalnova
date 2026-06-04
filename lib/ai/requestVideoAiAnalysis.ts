import { supabase } from "@/lib/supabase/client";
import type { VideoAnalysisScores } from "./types";
import { isOpenAiApiErrorCode } from "./classifyOpenAiError";
import {
  logAiAnalysisFailed,
  logAiAnalysisStarted,
  logAiApiResponse,
  logAiApiResponseExact,
} from "./aiAnalysisClientLog";
import { normalizeAiErrorCode } from "./normalizeAiErrorCode";

export type RequestVideoAiAnalysisParams = {
  videoId: string;
  locale?: string;
  /** Scout insight flow — server skips player premium requirement. */
  scoutInsight?: boolean;
};

/** Client-side guard so the modal never spins forever on slow networks. */
export const AI_ANALYSIS_REQUEST_TIMEOUT_MS = 90_000;

type ApiSuccess = { ok: true; scores: VideoAnalysisScores };
type ApiFailure = {
  ok: false;
  error: string;
  provider?: string;
  status?: number | null;
  code?: string | null;
  type?: string | null;
  messagePreview?: string;
};

export class VideoAiRequestError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "VideoAiRequestError";
    this.code = code;
  }
}

function bodyPreview(raw: string): string {
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}

export async function requestVideoAiAnalysis(
  params: RequestVideoAiAnalysisParams,
): Promise<VideoAnalysisScores> {
  const videoId = params.videoId?.trim();
  if (!videoId) {
    throw new VideoAiRequestError("invalid_video_id");
  }

  logAiAnalysisStarted({
    videoId,
    scoutInsight: params.scoutInsight,
    locale: params.locale,
  });

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    logAiAnalysisFailed({ reason: "session_error", error: sessionError });
    throw new VideoAiRequestError("not_authenticated");
  }

  const token = sessionData.session?.access_token?.trim();
  if (!token) {
    logAiAnalysisFailed({ reason: "not_authenticated" });
    throw new VideoAiRequestError("not_authenticated");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, AI_ANALYSIS_REQUEST_TIMEOUT_MS);

  let res: Response;
  let rawText = "";
  try {
    res = await fetch("/api/videos/ai-analyze", {
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
      signal: controller.signal,
    });
    rawText = await res.text();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      logAiAnalysisFailed({ reason: "client_timeout", error: e });
      throw new VideoAiRequestError("analysis_timeout");
    }
    logAiAnalysisFailed({ reason: "network_error", error: e });
    throw new VideoAiRequestError("network_error");
  } finally {
    clearTimeout(timeoutId);
  }

  let body: ApiSuccess | ApiFailure | null = null;
  try {
    body = rawText ? (JSON.parse(rawText) as ApiSuccess | ApiFailure) : null;
  } catch {
    body = null;
  }

  const headerError = res.headers.get("x-pitchrusch-ai-error")?.trim() || null;
  const apiError =
    body && "error" in body && typeof body.error === "string"
      ? body.error.trim()
      : undefined;

  logAiApiResponse({
    status: res.status,
    ok: res.ok && body?.ok === true,
    error: apiError ?? (res.ok ? undefined : `http_${res.status}`),
    bodyPreview: bodyPreview(rawText || "{}"),
  });

  const failureBody = body && body.ok === false ? body : null;
  logAiApiResponseExact({
    status: res.status,
    error: apiError,
    provider: failureBody?.provider,
    headerError,
    code: failureBody?.code ?? null,
    type: failureBody?.type ?? null,
  });

  if (!res.ok || !body || body.ok !== true) {
    const exact =
      apiError ||
      headerError ||
      (res.status === 0 ? "network_error" : `ai_analyze_http_${res.status}`);
    const code = isOpenAiApiErrorCode(exact)
      ? exact
      : normalizeAiErrorCode(exact);
    logAiAnalysisFailed({ reason: code, error: rawText || res.statusText });
    throw new VideoAiRequestError(code);
  }

  return body.scores;
}
