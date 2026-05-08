/**
 * Visibility-first AI output for a single video.
 * `visibility_analysis` holds evidence-based metrics; legacy columns remain for old rows.
 *
 * Model instructions (conservative, evidence-first) live in `videoAnalysisPrompts.ts`.
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
  /** Only metrics that were evaluated for this clip (assessable or explicitly skipped). */
  metrics: Partial<Record<FlexibleMetricKey, MetricAssessment>>;
  overall_confidence: number;
};

/** Build-time shape before mean confidence is computed from assessable metrics. */
export type VisibilityAnalysisDraft = Omit<
  VisibilityAnalysisPayload,
  "overall_confidence"
>;

export type VideoAnalysisScores = {
  /**
   * False when the clip is not football-related or lacks enough evidence for fair scoring.
   * When false, `visibility_analysis` must be null and no football metrics are produced.
   */
  valid_for_football_analysis: boolean;
  /** High-level classification (e.g. training, match, skill, non_football, unclear). */
  clip_type: string | null;
  /** Set when `valid_for_football_analysis` is false. */
  invalid_reason: string | null;
  overall_score: number;
  overall_confidence: number;
  feedback_text: string;
  visibility_analysis: VisibilityAnalysisPayload | null;
  /**
   * Rows saved before `visibility_analysis` existed: five legacy scores for the old UI.
   */
  legacy: {
    speed: number;
    technique: number;
    decision_making: number;
    agility: number;
    shot_power: number;
  } | null;
};
