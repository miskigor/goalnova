/**
 * AI video analysis types (v2 player-first schema + legacy visibility rows).
 */

export const FLEXIBLE_METRIC_KEYS = [
  "ball_control",
  "close_control",
  "dribbling",
  "acceleration",
  "agility",
  "first_touch",
  "passing",
  "shooting",
  "finishing",
  "coordination",
  "balance",
  "composure",
  "defending",
  "decision_making",
] as const;

export type FlexibleMetricKey = (typeof FLEXIBLE_METRIC_KEYS)[number];

export type MetricAssessment =
  | {
      status: "assessable";
      score: number;
      /** 0–1 — low values should be surfaced clearly in UI */
      confidence: number;
      evidence: string;
    }
  | {
      status: "not_assessable";
      reason: string;
    };

export type VisibilityAnalysisPayload = {
  schema_version: 1;
  clip_summary: string;
  clip_type: string;
  visible_actions: string[];
  camera: {
    quality: "strong" | "adequate" | "limited";
    assessment_note: string;
  };
  metrics: Partial<Record<FlexibleMetricKey, MetricAssessment>>;
  overall_confidence: number;
};

export type VisibilityAnalysisDraft = Omit<
  VisibilityAnalysisPayload,
  "overall_confidence"
>;

/** Eight core skills returned by the vision model (null = not visible). */
export type CoreSkillScores = {
  speed: number | null;
  technique: number | null;
  ball_control: number | null;
  agility: number | null;
  shooting: number | null;
  passing: number | null;
  decision_making: number | null;
  creativity: number | null;
};

/** Raw model JSON (see `videoAnalysisPrompts` v2 instructions). */
export type VideoAnalysisModelJson = {
  valid_for_football_analysis: boolean;
  overall_score: number;
  confidence: number;
  scores: CoreSkillScores;
  strengths: string[];
  improvements: string[];
  badges: string[];
  coach_feedback: string;
  player_friendly_summary: string;
};

/** Persisted inside `visibility_analysis` jsonb for v2 rows. */
export type VideoAnalysisV2Stored = {
  schema_version: 2;
  confidence: number;
  scores: CoreSkillScores;
  strengths: string[];
  improvements: string[];
  badges: string[];
  coach_feedback: string;
  player_friendly_summary: string;
  scout_visibility: VisibilityAnalysisPayload | null;
};

export type VideoAnalysisScores = {
  valid_for_football_analysis: boolean;
  clip_type: string | null;
  invalid_reason: string | null;
  overall_score: number;
  /** 0–1 for UI confidence bars */
  overall_confidence: number;
  feedback_text: string;
  visibility_analysis: VisibilityAnalysisPayload | null;
  legacy: {
    speed: number;
    technique: number;
    decision_making: number;
    agility: number;
    shot_power: number;
  } | null;
  /** Present on v2 analyses (also embedded in `visibility_analysis` when saved). */
  v2: Omit<VideoAnalysisV2Stored, "schema_version" | "scout_visibility"> | null;
};
