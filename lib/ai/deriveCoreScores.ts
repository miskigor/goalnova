import type { FlexibleMetricKey, MetricAssessment } from "./types";

function assessableScore(
  metrics: Partial<Record<FlexibleMetricKey, MetricAssessment>>,
  key: FlexibleMetricKey,
): number | null {
  const m = metrics[key];
  if (m?.status === "assessable") return m.score;
  return null;
}

function averageAssessable(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** Brzina — sprint, ubrzanje, eksplozivni koraci (ne miješati s tehnikom). */
export function deriveSpeedScore(
  metrics: Partial<Record<FlexibleMetricKey, MetricAssessment>>,
): number | null {
  const scores = (["acceleration", "agility"] as const)
    .map((key) => assessableScore(metrics, key))
    .filter((s): s is number => s != null);
  return averageAssessable(scores);
}

/** Tehnika — kvaliteta dodira, koordinacije i izvođenja (odvojeno od brzine). */
export function deriveTechniqueScore(
  metrics: Partial<Record<FlexibleMetricKey, MetricAssessment>>,
  clipType?: string,
): number | null {
  const shootingLike =
    clipType === "shooting_at_goal" ||
    clipType === "finishing" ||
    clipType === "free_kick";

  const keys: FlexibleMetricKey[] = shootingLike
    ? [
        "shooting",
        "close_control",
        "ball_control",
        "coordination",
        "first_touch",
      ]
    : [
        "coordination",
        "close_control",
        "ball_control",
        "first_touch",
        "passing",
      ];

  const scores = keys
    .map((key) => assessableScore(metrics, key))
    .filter((s): s is number => s != null);
  return averageAssessable(scores);
}
