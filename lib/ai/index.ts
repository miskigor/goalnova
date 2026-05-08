import type { VideoAnalysisProvider } from "./videoAnalysisProvider";
import { mockVideoAnalysisProvider } from "./mockVideoAnalysisProvider";

export type { VideoAnalysisScores } from "./types";
export type { VideoAnalysisProvider } from "./videoAnalysisProvider";
export { mockVideoAnalysisProvider } from "./mockVideoAnalysisProvider";
export {
  VIDEO_ANALYSIS_CONSERVATIVE_RULES,
  VIDEO_ANALYSIS_FOOTBALL_VALIDITY_GATE,
  VIDEO_ANALYSIS_SYSTEM_PROMPT,
  VIDEO_ANALYSIS_JSON_INSTRUCTIONS,
  VIDEO_ANALYSIS_USER_REMINDER,
  getDefaultVideoAnalysisPromptParts,
  buildVideoAnalysisUserPrompt,
  buildVideoAnalysisSystemMessageCombined,
} from "./videoAnalysisPrompts";
export type { VideoAnalysisPromptParts } from "./videoAnalysisPrompts";

/** Swap this for a production provider (e.g. OpenAI, custom edge function). */
let activeProvider: VideoAnalysisProvider = mockVideoAnalysisProvider;

export function getVideoAnalysisProvider(): VideoAnalysisProvider {
  return activeProvider;
}

export function setVideoAnalysisProvider(provider: VideoAnalysisProvider): void {
  activeProvider = provider;
}
