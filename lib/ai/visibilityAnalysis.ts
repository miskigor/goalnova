import type {
  CoreSkillScores,
  FlexibleMetricKey,
  MetricAssessment,
  VideoAnalysisV2Stored,
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

function parseCoreScores(raw: unknown): CoreSkillScores | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const keys = [
    "speed",
    "technique",
    "ball_control",
    "agility",
    "shooting",
    "passing",
    "decision_making",
    "creativity",
  ] as const;
  const scores = {} as CoreSkillScores;
  for (const key of keys) {
    const v = o[key];
    if (v === null || v === undefined) {
      scores[key] = null;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      scores[key] = Math.min(100, Math.max(0, Math.round(v)));
    } else {
      return null;
    }
  }
  return scores;
}

export function normalizeV2StoredPayload(
  raw: unknown,
): VideoAnalysisV2Stored | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema_version !== 2) return null;
  const scores = parseCoreScores(o.scores);
  if (!scores) return null;
  if (typeof o.confidence !== "number") return null;

  const strList = (v: unknown) =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim())
      : [];

  const scout =
    o.scout_visibility != null
      ? normalizeVisibilityPayload(o.scout_visibility)
      : null;

  return {
    schema_version: 2,
    confidence: Math.min(100, Math.max(0, Math.round(o.confidence))),
    scores,
    strengths: strList(o.strengths),
    improvements: strList(o.improvements),
    badges: strList(o.badges),
    coach_feedback:
      typeof o.coach_feedback === "string" ? o.coach_feedback.trim() : "",
    player_friendly_summary:
      typeof o.player_friendly_summary === "string"
        ? o.player_friendly_summary.trim()
        : "",
    scout_visibility: scout,
  };
}

export function normalizeVisibilityPayload(
  raw: unknown,
): VisibilityAnalysisPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema_version === 2) {
    const v2 = normalizeV2StoredPayload(raw);
    return v2?.scout_visibility ?? null;
  }
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
