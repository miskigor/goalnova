import type {
  FlexibleMetricKey,
  MetricAssessment,
  VisibilityAnalysisPayload,
} from "./types";

export const FLEXIBLE_METRIC_ORDER: FlexibleMetricKey[] = [
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
];

export function isAssessable(
  m: MetricAssessment | undefined,
): m is Extract<MetricAssessment, { status: "assessable" }> {
  return m?.status === "assessable";
}

/** Overall score = simple mean of assessable scores only (no penalty for skipped metrics). */
export function overallFromAssessableMetrics(
  metrics: Partial<Record<FlexibleMetricKey, MetricAssessment>>,
): { overall_score: number; overall_confidence: number } {
  const assessable: { score: number; confidence: number }[] = [];
  for (const k of FLEXIBLE_METRIC_ORDER) {
    const m = metrics[k];
    if (m?.status === "assessable") {
      assessable.push({
        score: m.score,
        confidence: Math.min(1, Math.max(0, m.confidence)),
      });
    }
  }
  if (assessable.length === 0) {
    return { overall_score: 0, overall_confidence: 0 };
  }
  const sumScore = assessable.reduce((a, x) => a + x.score, 0);
  const sumConf = assessable.reduce((a, x) => a + x.confidence, 0);
  return {
    overall_score: Math.round(
      Math.min(100, Math.max(0, sumScore / assessable.length)),
    ),
    overall_confidence: Math.min(
      1,
      Math.max(0, sumConf / assessable.length),
    ),
  };
}

export function normalizeVisibilityPayload(
  raw: unknown,
): VisibilityAnalysisPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema_version !== 1) return null;
  if (typeof o.clip_summary !== "string" || typeof o.clip_type !== "string")
    return null;
  if (!Array.isArray(o.visible_actions)) return null;
  if (!o.camera || typeof o.camera !== "object") return null;
  const cam = o.camera as Record<string, unknown>;
  if (
    cam.quality !== "strong" &&
    cam.quality !== "adequate" &&
    cam.quality !== "limited"
  )
    return null;
  if (typeof cam.assessment_note !== "string") return null;
  if (!o.metrics || typeof o.metrics !== "object") return null;
  if (typeof o.overall_confidence !== "number") return null;

  return raw as VisibilityAnalysisPayload;
}
