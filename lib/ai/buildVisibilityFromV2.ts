import type {
  FlexibleMetricKey,
  MetricAssessment,
  VideoAnalysisModelJson,
  VisibilityAnalysisPayload,
} from "./types";
import { overallFromAssessableMetrics } from "./visibilityAnalysis";

const CORE_TO_FLEX: Partial<
  Record<keyof VideoAnalysisModelJson["scores"], FlexibleMetricKey>
> = {
  speed: "acceleration",
  technique: "coordination",
  ball_control: "ball_control",
  agility: "agility",
  shooting: "shooting",
  passing: "passing",
  decision_making: "decision_making",
  creativity: "dribbling",
};

function metricFromScore(
  score: number,
  confidencePct: number,
  evidence: string,
): MetricAssessment {
  return {
    status: "assessable",
    score: Math.min(100, Math.max(0, Math.round(score))),
    confidence: Math.min(1, Math.max(0.35, confidencePct / 100)),
    evidence,
  };
}

/**
 * Scout/admin detail view: evidence-based metrics derived from v2 core scores.
 */
export function buildVisibilityFromV2(
  model: VideoAnalysisModelJson,
): VisibilityAnalysisPayload | null {
  if (!model.valid_for_football_analysis) return null;

  const evidenceBase =
    model.coach_feedback.trim() ||
    "Assessment based on visible football actions in the supplied frames.";

  const metrics: Partial<Record<FlexibleMetricKey, MetricAssessment>> = {};
  for (const [coreKey, flexKey] of Object.entries(CORE_TO_FLEX)) {
    const score =
      model.scores[coreKey as keyof VideoAnalysisModelJson["scores"]];
    if (score == null || !flexKey) continue;
    metrics[flexKey] = metricFromScore(score, model.confidence, evidenceBase);
  }

  const { overall_confidence } = overallFromAssessableMetrics(metrics);
  const strengthHint =
    model.strengths[0]?.trim() || "football actions visible in clip";

  return {
    schema_version: 1,
    clip_summary: model.player_friendly_summary || strengthHint,
    clip_type: "ai_v2_breakdown",
    visible_actions: model.strengths.length
      ? model.strengths.map((s) => s.toLowerCase().replace(/\s+/g, "_"))
      : ["football_action"],
    camera: {
      quality:
        model.confidence >= 72
          ? "strong"
          : model.confidence >= 48
            ? "adequate"
            : "limited",
      assessment_note:
        "Frame-based AI analysis — confidence reflects how clearly skills appear in the footage.",
    },
    metrics,
    overall_confidence,
  };
}
