/** Dev-friendly AI flow logging (client + shared helpers). */

export function logAiAnalysisStarted(payload: {
  videoId: string;
  scoutInsight?: boolean;
  locale?: string;
}): void {
  console.info("[PitchRusch AI] analysis started", payload);
}

export function logAiApiResponse(payload: {
  status: number;
  ok: boolean;
  error?: string;
  bodyPreview?: string;
}): void {
  console.info("[PitchRusch AI] api response", payload);
}

/** Temporary production-safe diagnostics for exact API error codes. */
export function logAiApiResponseExact(payload: {
  status: number;
  error?: string;
  provider?: string;
  headerError?: string | null;
  code?: string | null;
  type?: string | null;
}): void {
  console.info("[PitchRusch AI] api response exact", payload);
}

export function logAiAnalysisFailed(payload: {
  reason: string;
  error?: unknown;
}): void {
  console.error("[PitchRusch AI] analysis failed", payload);
}
