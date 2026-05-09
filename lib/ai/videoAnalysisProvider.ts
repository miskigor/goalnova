import type { VideoAnalysisScores } from "./types";

/**
 * Pluggable AI pipeline. Swap the default implementation for a real model / edge function.
 * Use `videoAnalysisPrompts.ts` (exported from `@/lib/ai`) for conservative system + JSON instructions.
 */
export interface VideoAnalysisProvider {
  analyzeVideo(input: { videoId: string; locale?: string }): Promise<VideoAnalysisScores>;
}
