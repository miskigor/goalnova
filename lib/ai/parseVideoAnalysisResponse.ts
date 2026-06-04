import type {
  CoreSkillScores,
  VideoAnalysisModelJson,
  VideoAnalysisScores,
} from "./types";
import { buildVisibilityFromV2 } from "./buildVisibilityFromV2";

const CORE_KEYS: (keyof CoreSkillScores)[] = [
  "speed",
  "technique",
  "ball_control",
  "agility",
  "shooting",
  "passing",
  "decision_making",
  "creativity",
];

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseNullableScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return clampInt(value, 0, 100);
}

function parseStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseScores(raw: unknown): CoreSkillScores {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = {} as CoreSkillScores;
  for (const key of CORE_KEYS) {
    out[key] = parseNullableScore(o[key]);
  }
  return out;
}

/** Mean of visible metrics, scaled by model confidence (0–100). */
export function computeOverallFromVisibleMetrics(
  scores: CoreSkillScores,
  confidence: number,
): number {
  const values = CORE_KEYS.map((k) => scores[k]).filter(
    (v): v is number => v != null,
  );
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const conf = clampInt(confidence, 0, 100) / 100;
  const adjusted = mean * (0.55 + 0.45 * conf);
  return clampInt(adjusted, 0, 100);
}

export function parseVideoAnalysisModelJson(
  raw: unknown,
): VideoAnalysisModelJson | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const valid =
    o.valid_for_football_analysis === true ||
    o.valid_for_football_analysis === false
      ? o.valid_for_football_analysis
      : null;
  if (valid === null) return null;

  const scores = parseScores(o.scores);
  const confidence = clampInt(
    typeof o.confidence === "number" ? o.confidence : 0,
    0,
    100,
  );

  return {
    valid_for_football_analysis: valid,
    overall_score: clampInt(
      typeof o.overall_score === "number" ? o.overall_score : 0,
      0,
      100,
    ),
    confidence,
    scores,
    strengths: parseStringArray(o.strengths, 5),
    improvements: parseStringArray(o.improvements, 5),
    badges: parseStringArray(o.badges, 5),
    coach_feedback:
      typeof o.coach_feedback === "string" ? o.coach_feedback.trim() : "",
    player_friendly_summary:
      typeof o.player_friendly_summary === "string"
        ? o.player_friendly_summary.trim()
        : "",
  };
}

export function modelJsonToVideoAnalysisScores(
  model: VideoAnalysisModelJson,
): VideoAnalysisScores {
  if (!model.valid_for_football_analysis) {
    return {
      valid_for_football_analysis: false,
      clip_type: "non_football",
      invalid_reason:
        model.coach_feedback ||
        "This clip is not suitable for football AI analysis.",
      overall_score: 0,
      overall_confidence: 0,
      feedback_text:
        model.player_friendly_summary ||
        model.coach_feedback ||
        "Upload a football clip where the player and ball are clearly visible.",
      visibility_analysis: null,
      legacy: null,
      v2: null,
    };
  }

  const visibleCount = CORE_KEYS.filter((k) => model.scores[k] != null).length;
  if (visibleCount === 0) {
    return {
      valid_for_football_analysis: false,
      clip_type: "unclear",
      invalid_reason:
        "Not enough visible football actions to score fairly in this clip.",
      overall_score: 0,
      overall_confidence: 0,
      feedback_text:
        model.player_friendly_summary ||
        "We could not see enough football action to score this clip.",
      visibility_analysis: null,
      legacy: null,
      v2: null,
    };
  }

  const overall_score = computeOverallFromVisibleMetrics(
    model.scores,
    model.confidence,
  );
  const overall_confidence = Math.min(1, Math.max(0, model.confidence / 100));

  const scout_visibility = buildVisibilityFromV2(model);

  const v2 = {
    confidence: model.confidence,
    scores: model.scores,
    strengths: model.strengths,
    improvements: model.improvements,
    badges: model.badges,
    coach_feedback: model.coach_feedback,
    player_friendly_summary: model.player_friendly_summary,
  };

  return {
    valid_for_football_analysis: true,
    clip_type: scout_visibility?.clip_type ?? "skill",
    invalid_reason: null,
    overall_score,
    overall_confidence,
    feedback_text:
      model.player_friendly_summary ||
      model.coach_feedback ||
      "Analysis based on visible football actions in this clip.",
    visibility_analysis: scout_visibility,
    legacy: null,
    v2,
  };
}

export function parseAndNormalizeVideoAnalysisResponse(
  raw: unknown,
): VideoAnalysisScores | null {
  const model = parseVideoAnalysisModelJson(raw);
  if (!model) return null;
  return modelJsonToVideoAnalysisScores(model);
}
