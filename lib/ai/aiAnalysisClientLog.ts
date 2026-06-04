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

export function logAiAnalysisFailed(payload: {
  reason: string;
  error?: unknown;
}): void {
  console.error("[PitchRusch AI] analysis failed", payload);
}
